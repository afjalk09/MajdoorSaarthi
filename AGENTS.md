# Agent Memory — AI-Powered Digital Labour Chowk

## Project Identity
- **Location**: E:\Labour
- **Stack**: React 18 + Vite + Tailwind CSS + shadcn/ui | Node.js + Express + PostgreSQL + Prisma ORM
- **Auth**: JWT + bcrypt, role-based (WORKER, EMPLOYER, ADMIN)
- **Deployment**: Vercel (frontend) + Render (backend + DB)

## Conventions

### UI/Frontend
- Always use **shadcn/ui** components (Button, Card, Input, Label, Badge, Alert)
- Install components: `npx shadcn@latest add [component]`
- Styling: Tailwind CSS with shadcn theme (green primary)
- Path alias: `@/` maps to `src/`

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

## Database Models

```
User → WorkerProfile (1:1)
User → EmployerProfile (1:1)
User → Documents (1:many)
EmployerProfile → Jobs (1:many)
Jobs → JobApplications (1:many)
Jobs → Payments (1:many)
Jobs → Ratings (1:many)
```

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
- `POST /api/worker/jobs/:id/apply` — Apply to job
- `GET /api/worker/applications` — My applications

### Employer
- `GET /api/employer/profile` — Get profile
- `PUT /api/employer/profile` — Update profile
- `POST /api/employer/documents` — Upload verification docs

### Jobs
- `POST /api/jobs` — Create job
- `GET /api/jobs` — My jobs
- `GET /api/jobs/:id` — Get job details
- `GET /api/jobs/:id/matches` — AI matched workers
- `POST /api/jobs/:id/hire/:workerId` — Hire worker
- `PUT /api/jobs/:id/status` — Update status

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
```

## Common Patterns

### Create with relation
```javascript
const user = await prisma.user.create({
  data: {
    email,
    phone,
    passwordHash,
    role: 'WORKER',
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
