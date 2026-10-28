# AI-Powered Digital Majdoorsaarthi

An AI-powered platform connecting daily-wage workers directly with employers through intelligent matching.

## Features

- **Worker Profiles**: Skills, experience, location, availability, wage expectations
- **Employer Profiles**: Individual, contractor, or company types
- **AI Matching**: Rule-based matching with weighted scoring (skills, experience, reliability, wage, proximity)
- **Job Management**: Create, apply, hire, track job status
- **Payment Tracking**: Employer records payments (UPI/offline/bank/cash, 5% platform fee); worker confirms receipt
- **Rating System**: 1-5 star ratings with reviews
- **Admin Panel**: Verification queue, analytics, user management

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + PostgreSQL
- **Auth**: JWT + bcrypt
- **Maps**: Google Maps API
- **Deployment**: Vercel (frontend) + Render (backend + DB)

## Project Structure

```
majdoorsaarthi/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, env config
│   │   ├── middleware/       # Auth, error handling
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic (AI matching)
│   │   └── utils/           # Helpers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── components/ui/   # shadcn/ui components
│   │   ├── pages/           # Page components
│   │   ├── context/         # Auth context
│   │   ├── services/        # API calls
│   │   └── lib/             # Utilities
│   └── package.json
└── docs/
    └── IMPLEMENTATION_PLAN.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or Render)
- Google Maps API key

### Backend Setup

1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your values:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/majdoorsaarthi
   JWT_SECRET=your_secret_key
   GOOGLE_MAPS_API_KEY=your_key
   FRONTEND_URL=http://localhost:5173
   ```

5. Run migrations:
   ```bash
   npm run migrate
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173

### Database Setup

1. Create PostgreSQL database
2. Update DATABASE_URL in backend `.env`
3. Run migrations: `npm run migrate`

## API Endpoints

### Auth
- `POST /api/auth/register` - Register (worker/employer)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Worker
- `GET/PUT /api/worker/profile` - Manage profile
- `POST /api/worker/documents` - Upload verification docs
- `GET /api/worker/jobs` - Available jobs
- `POST /api/worker/jobs/:id/apply` - Apply to job
- `GET /api/worker/applications` - My applications

### Employer
- `GET/PUT /api/employer/profile` - Manage profile
- `POST /api/employer/documents` - Upload verification docs

### Jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs` - My jobs
- `GET /api/jobs/:id/matches` - AI matched workers
- `POST /api/jobs/:id/hire/:workerId` - Hire worker
- `PUT /api/jobs/:id/status` - Update status

### Payments
- `POST /api/payments` - Employer records a payment to a hired worker (UPI/offline/bank/cash)
- `PUT /api/payments/:id/confirm` - Worker confirms receipt
- `PUT /api/payments/:id/cancel` - Employer cancels a pending payment
- `GET /api/payments` - My payment history
- `GET /api/payments/job/:jobId` - Payments for a job (participants only)

### Ratings
- `POST /api/ratings` - Rate after completion

### Admin
- `GET /api/admin/verifications` - Pending docs
- `PUT /api/admin/verifications/:id` - Approve/reject
- `GET /api/admin/workers` - All workers
- `GET /api/admin/jobs` - All jobs
- `GET /api/admin/analytics` - Platform stats

## AI Matching Algorithm

### Hard Filters
- Worker must be verified
- Worker must be available
- Skills must overlap with job requirements
- Distance must be within 50km

### Weighted Scoring
- Skill match: 30%
- Experience: 15%
- Reliability: 25%
- Wage compatibility: 15%
- Proximity: 15%

### Output
Each match includes:
- Match score (0-100%)
- Explainable reasons for the recommendation

## Deployment

### Frontend (Vercel)
1. Push to GitHub
2. Import project in Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`

### Backend (Render)
1. Push to GitHub
2. Create new Web Service on Render
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variables

## License

MIT

