# Agent Memory — AI-Powered Digital Labour Chowk

## Project Identity
- **Location**: E:\Labour
- **Stack**: React 18 + Vite + Tailwind CSS v3 + shadcn/ui | Node.js + Express + PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt, role-based (WORKER, EMPLOYER, ADMIN)
- **Deployment**: Vercel (frontend) + Render (backend + DB)

## Conventions

### UI/Frontend
- Always use **shadcn/ui** components (Button, Card, Input, Label, Badge, Alert, Dialog, Textarea, Select, Separator, DropdownMenu)
- Install components: `npx shadcn@latest add [component]`
- Styling: Tailwind CSS v3 with shadcn theme (green primary)
- Path alias: `@/` maps to `src/`
- CSS variables use HSL format: `hsl(var(--variable))` in tailwind.config.js
- **Label component**: Import from `@radix-ui/react-label`, NOT `@radix-ui/react-slot`
  - Wrong: `import * as LabelPrimitive from "@radix-ui/react-slot"` → causes "Slot failed to slot" error
  - Correct: `import * as LabelPrimitive from "@radix-ui/react-label"`
- **New shadcn/ui components installed**: dialog, textarea, select, separator, dropdown-menu
  - Dependencies: `@radix-ui/react-dialog`, `@radix-ui/react-separator`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`

### Backend
- ORM: **Prisma** (not Sequelize)
- Client singleton: `src/lib/prisma.js`
- Schema: `prisma/schema.prisma`
- File structure: `src/controllers/`, `src/routes/`, `src/services/`, `src/lib/`

### API Pattern
- REST with `/api/` prefix
- Success response: `{ success: true, data: {...} }`
- Error response: `{ success: false, message: "..." }`
- Auth header: `Authorization: Bearer <token>`

### Database (Prisma)
- Use `prisma.modelName` for queries
- camelCase for JS, PascalCase for Prisma model names
- Enums: WORKER, EMPLOYER, ADMIN, DAILY, HOURLY, PROJECT, etc.
- Relations: explicit `@relation(fields: [x], references: [id])`
- **CRITICAL**: Roles are stored UPPERCASE in DB (`WORKER`, `EMPLOYER`, `ADMIN`)
  - Always compare with uppercase in frontend switch/case
  - Wrong: `case 'worker':` → will never match backend response
  - Correct: `case 'WORKER':`

### Environment Setup
- Backend `.env` required: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `FRONTEND_URL`
- Frontend proxy in `vite.config.js`: `/api` → `http://localhost:5000`
- Frontend env (see `frontend/.env.example`): `VITE_SOCKET_URL` (socket origin) and `VITE_ASSET_URL` (backend origin for **all** REST calls; leave blank in dev so the Vite proxy handles `/api`, set to the Render URL in prod — there is no `vercel.json` rewrite, so relative URLs would 404 on the CDN host)
- Database: PostgreSQL on `localhost:5432` (default) or custom port

## Database Models

```
User → WorkerProfile (1:1)
User → EmployerProfile (1:1)
User → Documents (1:many)
User → Notifications (1:many)
User → Disputes (1:many)
User → ReviewsGiven (1:many)
User → ReviewsReceived (1:many)
EmployerProfile → Jobs (1:many)
Jobs → JobApplications (1:many)
Jobs → JobRoles (1:many)
Jobs → Payments (1:many)
Jobs → Ratings (1:many)
Jobs → Notifications (1:many)
Jobs → Milestones (1:many)
Jobs → Disputes (1:many)
Jobs → Reviews (1:many)
```

`Document` links to `User` by `userId` only — it has **no relation to `EmployerProfile`/`WorkerProfile`**. Contractor business details live as flat nullable columns on `EmployerProfile` itself (see Employer Business Verification); the 3 required uploads are `Document` rows, derived on read rather than linked by a foreign key.

### Multi-Worker Project (Job Roles) Model
A single `Job` (project) can require multiple workers across different **roles**.
- `Job.workersNeeded` = sum of all role `count`s.
- `JobRole` holds `roleName`, `skills[]`, `count` (required), `filledCount` (derived).
- `JobApplication` ties a worker to the job AND an optional `jobRoleId` (the role they applied for / were hired for).
- **`filledCount` is always DERIVED from real hired/COMPLETED applications** — never trust the stored value as a source of truth; recompute it (see `recomputeJobFill` below).

## Multi-Worker Project & Per-Worker Tracking

### Job Fill Logic (CRITICAL — was a bug)
- **Never compute "is job full" from a single role's stored `filledCount`.** The old bug: hiring a worker with no matching role (`jobRoleId = null`) never bumped any count, so fully-staffed jobs stayed `OPEN` forever.
- Use the shared helper in `backend/src/controllers/job.controller.js`:
  `recomputeJobFill(jobId)` — regroups `HIRED`/`COMPLETED` apps by `jobRoleId`, rewrites every role's `filledCount`, and sets job status: `IN_PROGRESS` when `hiredCount >= workersNeeded`, back to `OPEN` if understaffed while in progress. Never touches `COMPLETED`/`CANCELLED`. `OFFERED` apps are intentionally ignored (offers don't fill a slot; a job stays `OPEN` until a hire is *accepted*).
- Call `recomputeJobFill` after: **`acceptOffer`** (offer accepted), `releaseWorkerFromJob`, `updateJob` (role edits). On job completion all `HIRED` apps become `COMPLETED` + `workStatus: 'COMPLETED'` and workers return to `AVAILABLE`.
- `releaseWorkerFromJob({ jobId, workerId, appStatus })` — shared helper that frees a worker (sets `AVAILABLE`), sets app status (`WITHDRAWN` for worker-cancel, `REJECTED` for employer-remove) and runs `recomputeJobFill`. Only acts on `HIRED` apps.
- **Never hire role-less** (`jobRoleId = null`): `hireWorker` auto-assigns skill match, then falls back to the role with the most remaining capacity; if no role has space it returns `400 "No available slots in this job"`. This is what keeps role `filledCount`/requirements accurate.

### Role-aware Apply (skill-gated + re-apply allowed)
- `POST /api/worker/jobs/:id/apply` accepts optional `{ jobRoleId }`. Worker picks the role they're applying for. Validated: role belongs to job, has remaining capacity.
- **Skill gate (enforced at apply time)**: explicit-role path requires ≥1 shared skill between `profile.skills` and the role's `skills[]` (or role `skills[]` is empty) → else `400 "You don't have the skills required for this role"`. No-role path auto-picks the best skill-matching role with space; if none matches → `400 "You don't have the required skills for this job"`. An empty-skill allowance applies.
- **Re-apply**: a previous application with status `REJECTED` or `WITHDRAWN` can be re-submitted — the existing row is reused (status → `PENDING`, `jobRoleId` refreshed, `appliedAt`/`matchScore`/`matchReasons` reset) instead of returning "Already applied". Any other status → `400 "Already applied"` (`@@unique([jobId, workerId])`).
- `hireWorker` honors the applied `jobRoleId` passed in body OR the one already on the application.
- Worker availability becomes `BUSY` **only when an offer is accepted** (see Offer Flow below), not when offered.

### Offer Flow (hire = send offer; worker must accept) — grow this section
- **`hireWorker` (`POST /api/jobs/:id/hire/:workerId`) is "send offer", not hire.** It resolves the role (explicit → applied → skill auto-assign → most-remaining-capacity fallback), sets the application to **`OFFERED`**, leaves the worker **`AVAILABLE`**, does NOT recompute fill, and sends a `JOB_OFFER` notification that names the role + wage and carries `applicationId`.
- **Offers do NOT reserve a slot.** Capacity (`remainingCapacity`, drop-down options, `getMatches` suggestions) = `count - (HIRED + COMPLETED)` only. An employer can send offers to many workers; the **first acceptance wins**.
- **`POST /api/worker/applications/:id/accept`** (`acceptOffer`): worker accepts → re-validates still `AVAILABLE`, job active, and role still has a real free slot (`HIRED + COMPLETED < count`), then sets app `HIRED`, worker → `BUSY`, runs `recomputeJobFill` (may flip job `IN_PROGRESS`), notifies employer `OFFER_ACCEPTED`. **Auto-withdraw is capacity-aware**: other pending `OFFERED` apps for the same job+role are withdrawn (`OFFER_WITHDRAWN` + notification) ONLY when this acceptance makes the role FULL (`HIRED+COMPLETED >= count`); while seats remain the other offers stay open so the employer keeps filling. **A worker cannot accept a second offer while `BUSY`** (backend returns `400 "already assigned"`; the frontend hides the Accept button for OFFERED apps/notifications until the worker is free again).
- **`POST /api/worker/applications/:id/reject`** (`rejectOffer`): worker declines → app `REJECTED`, worker stays `AVAILABLE`, notifies employer `OFFER_DECLINED`. (Declined workers can re-apply later via the re-apply rule.)
- Frontend: `NotificationBell` + `Notifications.jsx` render inline **Accept/Reject** buttons for `JOB_OFFER` notifications with `application.status === 'OFFERED'`; `WorkerDashboard` applications tab shows OFFERED cards (role name + wage + Accept/Reject); `EmployerDashboard` hire actions say "Send Offer"/"OFFER PENDING".
- **Employer picks the role** (no silent auto-assign): Browse Workers, AI Matches, and Job Applications modals in `EmployerDashboard.jsx` render a role `<select>` per worker (open roles only), pre-selected to the AI-suggested role (matches) or applied role (applications), else most-remaining-capacity. `handleHire(job, workerId, suggestedId)` sends the chosen `jobRoleId`. **Role capacity is computed from REAL apps**: `getEmployerJobs`/`getJobById` attach `offeredCount` + `remainingCapacity = count - (HIRED+COMPLETED+OFFERED)` per role; `hireWorker` & `getMatches` use real remaining (not stored `filledCount`) so they never pick a role that's actually reserved full.

### Application Accept/Reject (employer responds to a worker's application)
- **`POST /api/jobs/:id/accept/:workerId`** (`acceptApplication`) and **`POST /api/jobs/:id/reject/:workerId`** (`rejectApplication`) are the employer's response to a **PENDING application** — distinct from sending an offer.
- **Accept = direct assignment** (Option A): validates employer owns the job + job active + worker still `AVAILABLE`, resolves the role (applied role → skill auto-assign → most-remaining-capacity fallback; else `400 "No available slots"`), sets app `PENDING → HIRED`, worker → `BUSY`, runs `recomputeJobFill` (may flip job `IN_PROGRESS`). Capacity-aware: if the role becomes full, other `OFFERED` apps on that role auto-withdraw (`OFFER_WITHDRAWN`). Worker notified `APPLICATION_ACCEPTED`.
- **Reject**: sets app `PENDING → REJECTED`, worker stays `AVAILABLE` and can re-apply later; worker notified `APPLICATION_REJECTED`.
- `applyToJob` creates the employer `APPLICATION_RECEIVED` notification **with `applicationId`** so the payload carries `application.workerId`/`jobRoleId`/`status`. `NotificationBell` + `Notifications.jsx` render inline **Accept/Reject** for it when `user.role === 'EMPLOYER'` && `application?.status === 'PENDING'`.

### Per-Worker Work Status (NOT milestones)
- MongoDB-like per-application fields on `JobApplication`: `workStatus` (NOT_STARTED | IN_PROGRESS | COMPLETED) and `workNote String?`.
- **Rationale**: milestones remain job-level; each worker is tracked separately via `workStatus`/`workNote` only (simple, per design choice).
- Endpoints:
  - `PUT /api/jobs/:id/workers/:workerId/status` (EMPLOYER) — set any hired worker's status/note.
  - `PUT /api/worker/applications/:id/work-status` (WORKER) — hired worker sets their own.
- `getJobById` returns `hiredWorkers[]` each with `{ id, userId, fullName, skills, workStatus, workNote }`, plus `jobRoles[]` with `filledCount`.
- Completion is **whole-project** (not per-worker): when the job is marked complete, all hired workers' apps → `COMPLETED` and workStatus → `COMPLETED`, freeing everyone at once.

### Prisma Schema Notes
- `JobApplication` fields: `id, jobId, workerId, jobRoleId?, status, matchScore?, matchReasons?, workStatus (default "NOT_STARTED"), workNote?, appliedAt` with `@@unique([jobId, workerId])`.
- `ApplicationStatus` enum includes: PENDING, ACCEPTED, REJECTED, HIRED, COMPLETED, WITHDRAWN, OFFERED, OFFER_WITHDRAWN.
- `Notification` has optional `applicationId` + relation `application` (links a `JOB_OFFER` to the `JobApplication`; `onDelete: SetNull`). `createNotification(userId, type, title, message, jobId = null, applicationId = null)`.
- Migrations: `20260905183019_add_work_status` (workStatus/workNote), `20260907064934_add_application_offered` (OFFERED status + Notification.applicationId), `20260907083950_add_offer_withdrawn` (OFFER_WITHDRAWN status).

## Job & Worker Images (no DB photo fields)
The `Job` model has **no image/photo field** — all job art is **derived at render time** from roles/titles. Workers only have `profilePhoto` (nullable), so worker images fall back to role art too.

- **Helper: `getJobImage(job)`** in `frontend/src/lib/roleImages.js` — resolves an HD Unsplash image by: (1) job's primary role `job.jobRoles[0].roleName` via `getRoleImage`, (2) falling back to matching `job.title` against `TITLE_ROLE_KEYWORDS` (compact copy of the backend backfill keyword map), (3) `DEFAULT_ROLE_IMAGE`. Returns a **banner crop** (`w=900&h=420&fit=crop&crop=entropy`, swapped by internal `toBanner`) — good for wide cards; square/thumb sizing is done via `className` on the component.
- **`getWorkerImage(worker)`** — `profilePhoto` wins, else `getRoleImage(worker.roles?.[0])`.
- **Reusable renderer: `frontend/src/components/JobImage.jsx`** — `<JobImage job={job} className="..." />` renders the IMG with an `onError` fallback (saffron→earth gradient + Wrench icon). `className` controls size/shape (e.g. `w-16 h-16 rounded-xl object-cover`). This is THE single place job images are drawn — reuse it anywhere a job image is needed.
- **`frontend/src/components/JobBanner.jsx`** — composes `JobImage`; takes `aspect` prop (default `aspect-[21/9]`; grid cards pass `aspect-[4/3]`) + dark gradient overlay + primary role-name label.
- **Where used**:
  - `WorkerDashboard` "Available Jobs": responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` of compact cards → `<JobBanner job aspect="aspect-[4/3]">` + role chips + Apply (full-screen banners were too big; use the grid).
  - `WorkerDashboard` "My Applications" + "History": list cards show `<JobImage>` thumbnails (`w-16 h-16 xl:w-20 xl:h-20 rounded-xl object-cover`) beside the title/status.
  - `JobTracking` detail page: `<JobBanner>` at top of the job card.
  - `EmployerDashboard` modals + `BrowseWorkers`: compact `WorkerThumb` (~`w-14 h-14`) using `getWorkerImage` with a role-label overlay.
- **Backend**: `GET /api/worker/applications` (`worker.controller.js` `getMyApplications`) includes `job: { include: { employer: true, jobRoles: true } }` so `app.job.jobRoles` exists and role images resolve exactly (title-keyword fallback still covers apps without roles).

## Employer Verification (ALL TYPES) + Business Block (CONTRACTOR / COMPANY)

Every employer must supply **PAN, Aadhaar, contact number and a registered address**, plus the **PAN + Aadhaar uploads**. `CONTRACTOR`/`COMPANY` additionally supply the legal business block and an **address-proof** upload. The business columns stay `NULL` for `INDIVIDUAL`.

### Fields (`EmployerProfile`, all nullable)
Shared (all types, migration `20260915090000_add_employer_contractor_details`): `panNumber`, `aadhaarNumber`, `registeredAddressLine1/Line2/City/State/Pincode`, `profileComplete Boolean @default(false)`. Plus `contactMobile` (migration `20260915120000_add_employer_contact_mobile`).

Business-only (`20260915090000`): `legalBusinessName`, `entityType EntityType?` (`PROPRIETORSHIP | PARTNERSHIP | LLP | PRIVATE_LIMITED`), `signatoryName`, `signatoryDesignation`, `signatoryMobile`, `signatoryEmail`, `addressProofDocType` (**derived server-side from the uploaded proof document — never trust the client**).

`displayName` remains the public-facing name shown on job cards; `legalBusinessName` is the tax-document name shown in the profile view and to admins. They are intentionally separate.

### Validation (`backend/src/lib/employerValidation.js`)
Two field sets, each entry mapping request key → Prisma column and declaring `required` / `test` / `enum`:
- **`COMMON_FIELDS`** — `pan_number`, `aadhaar_number`, `contact_mobile`, `registered_address_*`. Required for **every** account type.
- **`BUSINESS_ONLY_FIELDS`** — `legal_business_name`, `entity_type`, `signatory_*`. Required **only** for `CONTRACTOR`/`COMPANY` (an individual is their own signatory).

`validateProfileFields(body, isBusiness)` returns `{ data, fields }`; `employer.controller.js` responds `400 { success:false, message, fields:[{field,message}] }` so the UI can highlight individual inputs. `BUSINESS_ONLY_COLUMNS` is what gets nulled on a switch to `INDIVIDUAL`. Formats: PAN `/^[A-Z]{5}[0-9]{4}[A-Z]$/`, Aadhaar 12 digits, mobile `/^[6-9]\d{9}$/`, PIN 6 digits, email.

### Save ordering (CRITICAL)
Mandatory uploads must exist **before** the profile PUT validates. The frontend therefore **uploads first, then PUTs** (`EmployerProfile.jsx` `handleSave`). This is why `profileComplete` exists: the document-presence check only runs while `profileComplete === false`, so later edits never force an employer to re-upload already-approved documents. On success the backend sets `addressProofDocType` from the newest non-rejected proof document and sets `profileComplete = true`.

**Type-change exception**: `needsDocuments = !existing?.profileComplete || (typeChanged && isBusiness)`. Without the second clause an `INDIVIDUAL` could complete their profile (no address proof) and then switch to `CONTRACTOR` while inheriting `profileComplete === true`, skipping the address proof entirely. Only the *presence* of each doc is re-checked, so already-uploaded PAN/Aadhaar are not demanded again.

Switching to `INDIVIDUAL` **clears the business-only block** (legal name, entity type, signatory, `addressProofDocType`) but **keeps** PAN, Aadhaar, `contactMobile` and the registered address.

### Verification gating (`admin.controller.js` `recomputeEmployerVerification`)
Approving a single document used to set `isVerified = true` immediately. Now **PAN + AADHAAR must both be `APPROVED`** for any employer, and a business employer *additionally* needs one address proof approved. `recomputeEmployerVerification` is called for **both** approve and reject, so a rejection re-derives `false` rather than blanket-setting it.

### Required documents
- `INDIVIDUAL`: `PAN` + `AADHAAR`
- `CONTRACTOR`/`COMPANY`: `PAN` + `AADHAAR` + one `ADDRESS_PROOF_*` (`REQUIRED_BUSINESS_DOC_TYPES` in `employerDocs.js`; the frontend derives the same list in `EmployerProfile.jsx` `requiredDocTypes`).

## Verification Document Uploads
- **Middleware: `backend/src/middleware/upload.middleware.js`** — multer 2.x, `diskStorage` → `backend/uploads`, filename `<userId>-<ts>-<rand><ext>`, `fileFilter` for `image/jpeg|png|webp` + `application/pdf`, `limits { fileSize: 5MB, files: 1 }`. Exports `uploadSingleFile` (field name **`file`**) and `handleUploadErrors` (normalizes multer errors into the standard `{ success, message }` envelope).
- **Multer must run AFTER `authenticate`** in the route chain — the stored filename embeds `req.user.id`, and the route's `authorize('employer')` also relies on `req.user` (see known bug #4).
- **`DocType`** was extended with `ADDRESS_PROOF_UTILITY_BILL`, `ADDRESS_PROOF_RENT_AGREEMENT`, `ADDRESS_PROOF_GST_CERTIFICATE`. The `ADDRESS_PROOF_` prefix is what identifies proof documents; exactly one is required.
- **`POST /api/employer/documents`** validates `doc_type` against an allowlist (an unknown value used to become a Prisma 500) and uses **replace semantics**: re-uploading a `doc_type` deletes the caller's prior `PENDING` row of that type and unlinks the old file, so re-uploads after a rejection don't pile up.
- **`/uploads` is NOT served statically** (the mount was removed from `app.js`). PAN/Aadhaar files are streamed through `GET /api/employer/documents/:id/file`, which allows only the owner or an `ADMIN`. Because that route needs the `Authorization` header, the frontend must fetch it as a blob — use `openDocument()` / `downloadDocument()` from `frontend/src/lib/files.js`; a plain `<a href>` returns 401.
- **`api.js` hardcodes `Content-Type: application/json`** — override per request with `headers: { 'Content-Type': 'multipart/form-data' }` so axios sets the boundary.
- **Shared vocabularies**: `backend/src/lib/employerDocs.js` (entity types, doc types, `REQUIRED_BUSINESS_DOC_TYPES`, `isBusinessEmployerType`) and `frontend/src/lib/docTypes.js` (labels, options, `docTypeLabel`, upload limits). Keep both in sync with the Prisma enums.
- **Frontend**: `frontend/src/components/FileUpload.jsx` is the single reusable picker (dashed dropzone label, `sr-only` file input, client-side extension/size check, status `Badge`, view/replace). `EmployerProfile.jsx` renders the business block as four titled sub-cards.
- **Known limitation**: deleting a user cascades their `Document` rows but leaves the files on disk — there is no account-deletion endpoint, so no cleanup job exists yet.

## AI Matching Algorithm

### Hard Filters
- Worker must be verified (isVerified = true)
- Worker must be available (availability = AVAILABLE)
- Skills must overlap with job requiredSkills
- Distance must be within 50km

### Weighted Scoring
- Skill match: 30%
- Reliability: 25%
- Experience: 15%
- Wage compatibility: 15%
- Proximity: 15%

### Output
Each match includes:
- match_score (0-100)
- match_reasons (explainable array)

## API Endpoints

### Auth
- `POST /api/auth/register` — Register (worker/employer)
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user

### Worker
- `GET /api/worker/profile` — Get profile
- `PUT /api/worker/profile` — Update profile
- `POST /api/worker/documents` — Upload verification docs
- `GET /api/worker/jobs` — Available jobs
- `POST /api/worker/jobs/:id/apply` — Apply to job (optional `{ jobRoleId }`; skill-gated; re-apply allowed after REJECTED/WITHDRAWN)
- `PUT /api/worker/jobs/:id/cancel` — Worker cancels hired job (status → WITHDRAWN, freezes slot)
- `PUT /api/worker/applications/:id/work-status` — Worker updates own workStatus/workNote
- `POST /api/worker/applications/:id/accept` — Accept job offer (OFFERED → HIRED, worker → BUSY)
- `POST /api/worker/applications/:id/reject` — Decline job offer (OFFERED → REJECTED, worker stays AVAILABLE)
- `GET /api/worker/applications` — My applications (includes `jobRole` + `job.jobRoles` for role-aware job images; see Job & Worker Images)

### Employer
- `GET /api/employer/profile` — Get profile (404 when not created yet — the UI relies on this)
- `PUT /api/employer/profile` — Create/update profile (upsert). **Hard-validates the business block for `CONTRACTOR`/`COMPANY`** (see Employer Business Verification below)
- `GET /api/employer/documents` — My verification documents (newest first)
- `GET /api/employer/documents/:id/file` — Auth-gated file stream (owner or `ADMIN` only; must be fetched with the Bearer token, so use `openDocument()` from `frontend/src/lib/files.js` — a plain `<a href>` gets 401)
- `POST /api/employer/documents` — **Real multipart upload** (field name `file` + `doc_type` + optional `doc_number`); see Verification Document Uploads below
- `GET /api/employer/workers?job_id=` — Browse workers by location

### Jobs
- `POST /api/jobs` — Create job (sends `JOB_POSTED` notifications to **available workers whose skills overlap** the job's requiredSkills; no skill filter if job has no skills; not location-gated)
- `GET /api/jobs` — My jobs
- `GET /api/jobs/:id` — Get job details
- `GET /api/jobs/:id/matches` — AI matched workers
- `POST /api/jobs/:id/hire/:workerId` — Send job offer to worker (app → OFFERED; worker accepts via `/accept`)
- `POST /api/jobs/:id/accept/:workerId` — Employer accepts a PENDING application (app → HIRED, worker → BUSY, role slot filled, job may flip IN_PROGRESS; worker gets `APPLICATION_ACCEPTED` notification)
- `POST /api/jobs/:id/reject/:workerId` — Employer rejects a PENDING application (app → REJECTED, worker notified `APPLICATION_REJECTED`, stays AVAILABLE, can re-apply later)
- `PUT /api/jobs/:id/status` — Update status
- `PUT /api/jobs/:id/complete` — Mark job as completed (both parties)
- `POST /api/jobs/:id/remove/:workerId` — Employer removes hired worker (status → REJECTED)
- `PUT /api/jobs/:id/workers/:workerId/status` — Employer sets hired worker's workStatus/workNote

### Notifications
- `GET /api/notifications` — Get my notifications
- `GET /api/notifications/unread-count` — Get unread count
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all as read

## Real-Time Notifications (Socket.IO)
- **All notifications are delivered instantly** — the 30s bell poll is just a fallback/reconnect safety net.
- Backend: `socket.io` attached to the HTTP server in `backend/src/app.js` (`http.createServer(app)` → `require('./lib/socket').init(server)` → `server.listen`). `backend/src/lib/socket.js` verifies the JWT from `socket.handshake.auth.token`, joins room `user:<userId>`, exposes `emitToUser(userId, event, payload)`.
- Every new notification is pushed to the user's socket room from `createNotification()` in `notification.controller.js` (emits `notification:new` with a payload shaped like `GET /notifications` — includes `job` and `application.jobRole`).
- Frontend: `frontend/src/services/socket.js` is a singleton `io(VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token } }, transports websocket+polling)`. `NotificationBell.jsx` and `Notifications.jsx` subscribe to `notification:new` and refetch via REST on arrival.
- Env: frontend `VITE_SOCKET_URL` → backend origin (dev default `http://localhost:5000`, Render URL in prod). Socket.IO CORS reuses backend `FRONTEND_URL`. Render supports WebSockets.

### Milestones
- `GET /api/milestones/job/:jobId` — Get milestones for job
- `POST /api/milestones/job/:jobId` — Create milestone (employer only)
- `PUT /api/milestones/:id` — Update milestone status
- `DELETE /api/milestones/:id` — Delete milestone (employer only)

### Disputes
- `POST /api/disputes` — Raise a dispute
- `GET /api/disputes/my` — My raised disputes
- `GET /api/disputes/job/:jobId` — Get disputes for job
- `GET /api/disputes/admin/all` — Admin: all disputes
- `PUT /api/disputes/admin/:id/resolve` — Admin: resolve dispute

### Reviews
- `POST /api/reviews` — Submit review (after job completion)
- `GET /api/reviews/user/:userId` — Get reviews for user
- `GET /api/reviews/job/:jobId` — Get reviews for job

### Payments
- `POST /api/payments/initiate` — Start payment
- `PUT /api/payments/:id/confirm` — Confirm payment

### Ratings
- `POST /api/ratings` — Rate after completion

### Admin
- `GET /api/admin/verifications` — Pending docs
- `PUT /api/admin/verifications/:id` — Approve/reject
- `GET /api/admin/workers` — All workers
- `GET /api/admin/jobs` — All jobs
- `GET /api/admin/analytics` — Platform stats

## Prisma Commands

```bash
# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset

# Validate schema
npx prisma validate

# Backfill legacy role-less HIRED/COMPLETED apps with jobRoleId (fixes stuck 0/x role counts)
npm run prisma:backfill  # -> node prisma/backfillRoleAssignments.js
```

## Common Patterns

### Create with relation
```javascript
const user = await prisma.user.create({
  data: {
    email,
    phone,
    passwordHash,
    role: 'WORKER',  // Always UPPERCASE
    workerProfile: {
      create: { fullName, skills }
    }
  }
});
```

### Find with relation
```javascript
const job = await prisma.job.findUnique({
  where: { id },
  include: { employer: true }
});
```

### Update
```javascript
const updated = await prisma.model.update({
  where: { id },
  data: { field: value }
});
```

### Count
```javascript
const count = await prisma.model.count({
  where: { status: 'OPEN' }
});
```

### Aggregate
```javascript
const result = await prisma.payment.aggregate({
  _sum: { amount: true, platformCommission: true }
});
```

## Known Bugs & Fixes

### 1. Role Case Mismatch (CRITICAL)
- **Symptom**: Login/Register succeeds but user redirected to `/` (blank page or landing)
- **Cause**: Backend stores `WORKER`/`EMPLOYER` (uppercase), frontend compared against `worker`/`employer` (lowercase)
- **Fix**: `App.jsx` switch cases must use UPPERCASE: `case 'WORKER':`, `case 'EMPLOYER':`, `case 'ADMIN':`
- **File**: `frontend/src/App.jsx` — `getDashboard()` function

### 2. Label Component Import Error
- **Symptom**: "Slot failed to slot onto its children" — React crashes, blank white page
- **Cause**: `label.jsx` imported from `@radix-ui/react-slot` instead of `@radix-ui/react-label`
- **Fix**: Change import to `import * as LabelPrimitive from "@radix-ui/react-label"`
- **File**: `frontend/src/components/ui/label.jsx`

### 3. Missing Backend .env
- **Symptom**: Prisma CLI error "Environment variable not found: DATABASE_URL"
- **Fix**: Create `backend/.env` from `.env.example` with actual PostgreSQL credentials

### 4. Missing authenticate middleware in routes (CRITICAL)
- **Symptom**: "Cannot read properties of undefined (reading 'role')" on server
- **Cause**: Using `authorize()` without `authenticate` first, so `req.user` is undefined
- **Fix**: Always chain `authenticate` before `authorize` in routes: `router.get('/', authenticate, authorize(), handler)`
- **File**: Any new route file in `backend/src/routes/`

### 5. Job stays OPEN when fully staffed (CRITICAL, now fixed)
- **Symptom**: Multi-worker project shows OPEN for both sides even though all role slots are filled.
- **Cause**: `hireWorker` computed "all filled" from each role's stored `filledCount`, which never incremented when a worker was hired with `jobRoleId = null` (no skill overlap), so the job never flipped to `IN_PROGRESS`.
- **Fix**: Never trust stored `filledCount`. Use `recomputeJobFill(jobId)` in `job.controller.js` (groups real `HIRED`/`COMPLETED` apps by role, derives `filledCount`, sets `IN_PROGRESS`/`OPEN`). Role-aware apply ensures roles are set going forward.

### 6. Prisma engine lock on migrate while backend runs
- **Symptom**: `prisma migrate dev`/`generate` hangs or fails "already in use".
- **Fix**: Kill running backend node processes (incl. nodemon) BEFORE Prisma CLI, then restart backend after. Commands on Windows: `powershell -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"`.

### 7. Role-filledCount stuck at 0/x when hiring (CRITICAL, now fixed)
- **Symptom**: "Requirements of labour not updating" — after hiring a worker from **Browse Workers**, the role badge still shows e.g. `Mason: 0/2` even though the worker is hired and the job flipped `IN_PROGRESS`.
- **Cause**: The browse-workers hire passed **no role** (`jobRoleId = null` on the app), so `recomputeJobFill` counted the worker in `hiredCount` but could attribute them to **no role** — every role's `filledCount` stayed 0.
- **Fix**: `hireWorker` can never create a role-less app: skill auto-assign → falls back to the role with the **most remaining capacity** → else `400 "No available slots in this job"`. Legacy rows fixed via `npm run prisma:backfill` (`backend/prisma/backfillRoleAssignments.js`).

### 8. "Already applied" blocked re-applying after rejection (fixed) + skill-gated apply
- **Symptom**: Worker who was rejected (or withdrew) from a job got `400 "Already applied"` forever.
- **Cause**: `applyToJob` returned "Already applied" for ANY existing row (`@@unique([jobId, workerId])` prevents a second row).
- **Fix**: Re-apply allowed when previous status is `REJECTED` or `WITHDRAWN` — reuses the row (status → `PENDING`, role refreshed). Other statuses still blocked. Apply is now **skill-gated**: worker needs ≥1 shared skill with the chosen/auto-picked role (`skills[]` empty ⇒ allowed).

### 9. Browse Workers "Send Offer" had no job context (fixed)
- **Symptom**: `BrowseWorkers` couldn't reliably send offers — no selected job → `effectiveRoleId`/role capacity always unresolved and offers were disabled.
- **Fix**: `BrowseWorkers.jsx` gained a **"Select a job to send offers"** dropdown (fetches `GET /api/jobs`, auto-selects the first `OPEN`/`IN_PROGRESS` job via `setSearchParams({ job_id })`). Send Offer is disabled until a real open role slot exists (`effectiveRoleId(workerId, suggestedId)`).

### 10. Landing-page CTAs jumped straight to dashboard (fixed)
- **Symptom**: Clicking "Find Workers" / "Register as Worker" (or service cards / "Get Started Free") on the landing page went directly to the dashboard instead of `/register`.
- **Cause**: `Landing.jsx` CTAs were `to={user ? '/dashboard' : '/register'}` and `useAuth` restored a **stale** `user` from `localStorage`, so the ternary always took the dashboard branch.
- **Fix**: (a) `Landing.jsx` CTA links are unconditional `to="/register"`, and the public header now always shows Login/Register (no Dashboard button). (b) `AuthContext.jsx` validates the stored session on load via `GET /auth/me`: on 401 clears `localStorage` token/user, disconnects socket, `setUser(null)`; on any other error keeps the cached user; `setLoading(false)` runs in `finally`.

### 11. Admin dashboard read snake_case Prisma output (fixed)
- **Symptom**: The Verifications tab threw `Cannot read properties of undefined (reading 'toUpperCase')` as soon as any document row existed, so document review was impossible. The Workers and Jobs tabs rendered blank names/numbers for the same reason.
- **Cause**: `AdminDashboard.jsx` read `doc.doc_type`, `doc.created_at`, `worker.full_name`, `worker.is_verified`, `worker.experience_years`, `worker.reliability_score`, `worker.expected_wage_min/max`, `worker.wage_type`, `job.location_text`, `job.employer.display_name`, `job.wage_amount`, `job.wage_type` — all snake_case, but Prisma returns camelCase.
- **Fix**: Switched every one of these to camelCase, and added a `View` button (via `openDocument`) plus the doc-number line so admins can actually inspect the uploaded file. See Verification Document Uploads above.

### 12. Employer document upload was a fake (fixed)
- **Symptom**: "Upload your PAN/Aadhaar" was impossible — there was no file input anywhere in the frontend, `multer` was installed but never imported, `backend/uploads/` was empty, and `POST /employer/documents` only stored a client-supplied `file_url` string with no mime/size checks.
- **Fix**: Added real multer upload middleware, an auth-gated file stream, `GET /employer/documents`, and the `FileUpload` component. See Verification Document Uploads.

## Express.js Best Practices

### Error Handling
```javascript
// Async handler wrapper (avoids try/catch in every route)
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Error middleware (must be LAST)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});
```

### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

### Body Parsing (built-in, no body-parser needed)
```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

## React Patterns

### Context API
```javascript
// Create
const AuthContext = createContext(null);

// Provider with state
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Consumer hook (throws if used outside provider)
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Performance Optimization
- Use `useCallback` for functions passed to memoized children
- Use `useMemo` for expensive calculations
- Avoid unnecessary re-renders by keeping state local when possible

## Tailwind CSS v3 Patterns

### CSS Variables (HSL format)
```css
:root {
  --primary: 142.1 76.2% 36.3%;  /* Green */
  --primary-foreground: 355.7 100% 97.3%;
}
```

### Usage in tailwind.config.js
```javascript
colors: {
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
}
```

### Dark Mode
```javascript
// tailwind.config.js
darkMode: ["class"],
```
```html
<html class="dark">
```

## Startup Commands

```bash
# Frontend
cd frontend && npm run dev    # Vite dev server on :5173

# Backend
cd backend && npm run dev     # nodemon on :5000

# Database
cd backend && npx prisma migrate dev
cd backend && npx prisma studio

# E2E tests (needs local Postgres + dev servers running; config reuses them)
cd frontend && npm run test:e2e
```

## End-to-End Tests (Playwright)
- Suite: `frontend/e2e/auth.spec.js` — 7 tests: landing CTAs (`/register` + header Login), worker/employer registration → the **correct** role dashboard (worker sees "Available Jobs" heading, employer sees "My Jobs" button), logout → login roundtrip, wrong-password error toast, unauthenticated `/dashboard` → `/login`, and a no-Dashboard-button assertion on the landing page.
- Config: `frontend/playwright.config.js` — chromium only, `workers: 1`, `retries: 1`, `baseURL http://localhost:5173`, HTML report. `webServer` array boots **backend** (probe `GET /api/health`, which exists in `backend/src/app.js`) and **frontend**, both with `reuseExistingServer: !CI` — so a running dev stack is reused (do NOT probe with a POST-only route like `/api/auth/login` → EADDRINUSE).
- Install browsers once: `npx playwright install chromium`. The test deps are `@playwright/test` in `frontend/package.json` (`"test:e2e": "playwright test"`).
- **Avoid strict-mode locator clashes**: `page.getByText('Available Jobs')` matches 2 nodes (tab + heading) → use `getByRole('heading', ...)`; for employer tabs use `getByRole('button', { name: 'My Jobs' })`.
- **`npm run lint` is pre-existing broken** (ESLint 9 but no `eslint.config.js` in the repo). Use `npm run build` + `npm run test:e2e` to verify changes instead.

## Frontend Components & Pages

### Reusable Job/Worker Image Components
- `JobImage.jsx` — `<JobImage job className>` renders the derived job image with `onError` fallback; THE shared job-image method (see Job & Worker Images).
- `JobBanner.jsx` — wide banner composed from `JobImage`; `aspect` prop controls shape.

### Verification / File Components
- `FileUpload.jsx` — `<FileUpload id label file onSelect existing required />`; THE single document picker (see Verification Document Uploads). Shows the picked file + size, the existing document's status badge, and View/Replace.
- `lib/docTypes.js` — entity/address-proof/doc-type labels + options, upload limits, `isDocumentOnFile()`. Mirror of `backend/src/lib/employerDocs.js`.
- `lib/files.js` — `openDocument(doc)` / `downloadDocument(doc)` fetch a document as a **blob with the Bearer token** and return an object URL. Never link a document file directly.

### New Components (Notifications/Tracking/Disputes/Reviews)
- `NotificationBell.jsx` — Bell icon with unread count dropdown (updates instantly via socket; 30s poll is fallback). Shows relative time per item.
- `Notifications.jsx` — Full notification list; each card shows relative + absolute timestamp (e.g. `3m ago • Sep 8, 2026, 4:12 PM`).
- Time formatting shared helper: `frontend/src/lib/format.js` — `timeAgo(date)` (relative) and `formatDateTime(date)` (localized `{ dateStyle:'medium', timeStyle:'short' }`). Use these for any notification/activity timestamps.
- `MilestoneCard.jsx` — Add/update/delete milestones for job tracking
- `DisputeForm.jsx` — Dialog to raise disputes with reason selector
- `ReviewModal.jsx` — Star rating + comment form for post-job reviews

### New Pages
- `Notifications.jsx` — Full notification list with mark-read
- `JobTracking.jsx` — View job details + milestones + complete/dispute actions
- `Disputes.jsx` — View raised disputes with status

### Updated Pages
- `EmployerDashboard.jsx` — Added notification bell, Track Job, Dispute, Review buttons; worker thumbnails (`WorkerThumb`) + role-chips in Browse Workers / AI Matches / Applications modals.
- `WorkerDashboard.jsx` — Added notification bell, Track Job, Dispute buttons; "Available Jobs" is a responsive image-grid of compact cards; Applications/History tabs show job-image thumbnails.
- `BrowseWorkers.jsx` — "Select a job to send offers" dropdown so Send Offer works reliably.
- `EmployerProfile.jsx` — **Rewritten**: shadcn `Select` for account type. PAN & Aadhaar, contact number and the registered address are **shown for every type**; only Legal Business Details and Authorized Signatory are gated behind `CONTRACTOR`/`COMPANY` (the address-proof dropdown and upload is business-only too). Inline per-field errors, a rejected-documents banner, and read-only cards for business details, signatory, address and document statuses (Aadhaar masked).
- `AdminDashboard.jsx` — Verifications tab now reads camelCase, shows the doc number + upload time and a **View** button; Workers/Jobs tabs fixed to camelCase too.

### Routes Added
- `/notifications` — Full notification page
- `/jobs/:id/track` — Job tracking with milestones
- `/disputes` — View raised disputes

## Context7 MCP — Latest Tech Stack Documentation

Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer — your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

### Steps

1. Always start with `resolve-library-id` using the library name and what to look up in the library's documentation, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and what to look up in the library's documentation (not single words), scoped to a single concept. If the question spans multiple distinct concepts (e.g. routing and auth and caching), make a separate `query-docs` call per concept with the same library ID, unless the question is about how the concepts interact — combined queries dilute ranking and return shallow results for each topic
4. Answer using the fetched docs
