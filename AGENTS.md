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
  `recomputeJobFill(jobId)` — regroups `HIRED`/`COMPLETED` apps by `jobRoleId`, rewrites every role's `filledCount`, and sets job status: `IN_PROGRESS` when `hiredCount >= workersNeeded`, back to `OPEN` if understaffed while in progress. Never touches `COMPLETED`/`CANCELLED`.
- Call `recomputeJobFill` after: `hireWorker`, `releaseWorkerFromJob`, `updateJob` (role edits). On job completion all `HIRED` apps become `COMPLETED` + `workStatus: 'COMPLETED'` and workers return to `AVAILABLE`.
- `releaseWorkerFromJob({ jobId, workerId, appStatus })` — shared helper that frees a worker (sets `AVAILABLE`), sets app status (`WITHDRAWN` for worker-cancel, `REJECTED` for employer-remove) and runs `recomputeJobFill`.

### Role-aware Apply
- `POST /api/worker/jobs/:id/apply` accepts optional `{ jobRoleId }`. Worker picks the role they're applying for. Validated: role belongs to job, has remaining capacity (from real hired count). No role → auto-pick best skill-matching role with space (else null).
- `hireWorker` honors the applied `jobRoleId` passed in body OR the one already on the application.
- Worker availability: hiring a worker sets them `BUSY` (can't apply/hired elsewhere) until freed.

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
- `ApplicationStatus` enum includes: PENDING, ACCEPTED, REJECTED, HIRED, COMPLETED, WITHDRAWN.
- Migration: `20260905183019_add_work_status` (added workStatus/workNote).

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
- `POST /api/worker/jobs/:id/apply` — Apply to job (optional `{ jobRoleId }`)
- `PUT /api/worker/jobs/:id/cancel` — Worker cancels hired job (status → WITHDRAWN, freezes slot)
- `PUT /api/worker/applications/:id/work-status` — Worker updates own workStatus/workNote
- `GET /api/worker/applications` — My applications

### Employer
- `GET /api/employer/profile` — Get profile
- `PUT /api/employer/profile` — Update profile
- `POST /api/employer/documents` — Upload verification docs
- `GET /api/employer/workers?job_id=` — Browse workers by location

### Jobs
- `POST /api/jobs` — Create job
- `GET /api/jobs` — My jobs
- `GET /api/jobs/:id` — Get job details
- `GET /api/jobs/:id/matches` — AI matched workers
- `POST /api/jobs/:id/hire/:workerId` — Hire worker
- `PUT /api/jobs/:id/status` — Update status
- `PUT /api/jobs/:id/complete` — Mark job as completed (both parties)
- `POST /api/jobs/:id/remove/:workerId` — Employer removes hired worker (status → REJECTED)
- `PUT /api/jobs/:id/workers/:workerId/status` — Employer sets hired worker's workStatus/workNote

### Notifications
- `GET /api/notifications` — Get my notifications
- `GET /api/notifications/unread-count` — Get unread count
- `PUT /api/notifications/:id/read` — Mark as read
- `PUT /api/notifications/read-all` — Mark all as read

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
```

## Frontend Components & Pages

### New Components (Notifications/Tracking/Disputes/Reviews)
- `NotificationBell.jsx` — Bell icon with unread count dropdown (auto-refreshes every 30s)
- `MilestoneCard.jsx` — Add/update/delete milestones for job tracking
- `DisputeForm.jsx` — Dialog to raise disputes with reason selector
- `ReviewModal.jsx` — Star rating + comment form for post-job reviews

### New Pages
- `Notifications.jsx` — Full notification list with mark-read
- `JobTracking.jsx` — View job details + milestones + complete/dispute actions
- `Disputes.jsx` — View raised disputes with status

### Updated Pages
- `EmployerDashboard.jsx` — Added notification bell, Track Job, Dispute, Review buttons
- `WorkerDashboard.jsx` — Added notification bell, Track Job, Dispute buttons

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
