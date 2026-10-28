# AI-Powered Digital Majdoorsaarthi — Implementation Plan

## Project Overview

An AI-powered platform connecting daily-wage workers directly with employers. Features rule-based matching, multi-worker hiring, payment tracking, and admin verification.

**Tech Stack:**
- Frontend: React 18 + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT + bcrypt
- Maps: Google Maps API
- Email: EmailJS / SendGrid free tier
- Deployment: Vercel (frontend) + Render (backend + DB)

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Structure Setup
```
majdoorsaarthi/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, env, constants
│   │   ├── middleware/       # auth, validation, error handler
│   │   ├── models/          # Sequelize models
│   │   ├── routes/          # API routes
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Helpers
│   │   └── app.js           # Express app setup
│   ├── migrations/
│   ├── seeders/
│   ├── .env.example
│   ├── package.json
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── context/         # Auth context
│   │   ├── services/        # API calls
│   │   ├── utils/           # Helpers
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── .gitignore
├── docs/
│   └── IMPLEMENTATION_PLAN.md
└── README.md
```

### 1.2 Backend Setup
- [ ] Initialize Node.js project with Express
- [ ] Install dependencies: express, pg, sequelize, bcryptjs, jsonwebtoken, cors, dotenv, multer
- [ ] Set up PostgreSQL connection (Render)
- [ ] Create .env with DATABASE_URL, JWT_SECRET, GOOGLE_MAPS_API_KEY
- [ ] Set up error handling middleware
- [ ] Set up CORS for frontend

### 1.3 Frontend Setup
- [ ] Create React app with Vite
- [ ] Install Tailwind CSS
- [ ] Install dependencies: react-router-dom, axios
- [ ] Set up API service with axios interceptors
- [ ] Set up AuthContext

### 1.4 Authentication System
- [ ] Register endpoint (POST /api/auth/register)
- [ ] Login endpoint (POST /api/auth/login)
- [ ] JWT middleware for protected routes
- [ ] Role-based access control middleware

---

## Phase 2: Database & Profiles (Week 3-4)

### 2.1 Database Schema (Sequelize Models)

```sql
-- Users table (base auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('worker', 'employer', 'admin') NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Worker Profiles
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  aadhaar_number VARCHAR(12),
  pan_number VARCHAR(10),
  skills TEXT[],
  experience_years INT DEFAULT 0,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_text VARCHAR(255),
  availability ENUM('available', 'busy', 'unavailable') DEFAULT 'available',
  expected_wage_min DECIMAL(10, 2),
  expected_wage_max DECIMAL(10, 2),
  wage_type ENUM('daily', 'hourly', 'project') DEFAULT 'daily',
  reliability_score DECIMAL(3, 2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  profile_photo VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Employer Profiles
CREATE TABLE employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  employer_type ENUM('individual', 'contractor', 'company') NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  aadhaar_number VARCHAR(12),
  pan_number VARCHAR(10),
  company_reg_number VARCHAR(50),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_text VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents (Verification)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  doc_type ENUM('aadhaar', 'pan', 'skill_certificate', 'company_registration') NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Jobs
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employer_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required_skills TEXT[],
  workers_needed INT DEFAULT 1,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_text VARCHAR(255),
  wage_amount DECIMAL(10, 2) NOT NULL,
  wage_type ENUM('daily', 'hourly', 'project') NOT NULL,
  duration_days INT,
  status ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Job Applications
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  worker_id UUID REFERENCES worker_profiles(id),
  status ENUM('pending', 'accepted', 'rejected', 'hired', 'completed') DEFAULT 'pending',
  match_score DECIMAL(5, 2),
  match_reasons JSONB,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  worker_id UUID REFERENCES worker_profiles(id),
  employer_id UUID REFERENCES employer_profiles(id),
  amount DECIMAL(10, 2) NOT NULL,
  platform_commission DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('upi', 'offline') NOT NULL,
  status ENUM('pending', 'completed', 'disputed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  rater_id UUID REFERENCES users(id),
  ratee_id UUID REFERENCES users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Worker Profile CRUD
- [ ] Create worker profile (POST /api/worker/profile)
- [ ] Get worker profile (GET /api/worker/profile)
- [ ] Update worker profile (PUT /api/worker/profile)
- [ ] Upload documents (POST /api/worker/documents)

### 2.3 Employer Profile CRUD
- [ ] Create employer profile (POST /api/employer/profile)
- [ ] Get employer profile (GET /api/employer/profile)
- [ ] Update employer profile (PUT /api/employer/profile)
- [ ] Upload documents (POST /api/employer/documents)

### 2.4 Google Maps Integration
- [ ] Location picker component (lat/lng selection)
- [ ] Distance calculation service (Haversine formula)
- [ ] Geocoding service (address ↔ coordinates)

---

## Phase 3: Jobs & AI Matching (Week 5-6)

### 3.1 Job Management
- [ ] Create job (POST /api/jobs)
- [ ] Get employer's jobs (GET /api/jobs)
- [ ] Get job details (GET /api/jobs/:id)
- [ ] Update job status (PUT /api/jobs/:id/status)
- [ ] Get available jobs for workers (GET /api/worker/jobs)

### 3.2 AI Matching Engine

```javascript
// services/matchingService.js

const calculateMatchScore = (worker, job) => {
  const weights = {
    skill: 0.30,
    experience: 0.15,
    reliability: 0.25,
    wage: 0.15,
    proximity: 0.15
  };

  // Skill match: % of required skills worker has
  const requiredSkills = job.required_skills;
  const workerSkills = worker.skills;
  const matchedSkills = requiredSkills.filter(s => workerSkills.includes(s));
  const skillScore = (matchedSkills.length / requiredSkills.length) * 100;

  // Experience: years / 10 (capped at 100)
  const experienceScore = Math.min((worker.experience_years / 10) * 100, 100);

  // Reliability: from past ratings (0-100)
  const reliabilityScore = worker.reliability_score;

  // Wage compatibility: how close job wage is to worker expectation
  const avgExpected = (worker.expected_wage_min + worker.expected_wage_max) / 2;
  const wageDiff = Math.abs(job.wage_amount - avgExpected);
  const wageScore = Math.max(0, 100 - (wageDiff / avgExpected) * 100);

  // Proximity: inverse of distance (closer = higher)
  const distance = calculateDistance(
    worker.location_lat, worker.location_lng,
    job.location_lat, job.location_lng
  );
  const proximityScore = Math.max(0, 100 - (distance / 50) * 100); // 50km max

  const totalScore = (
    skillScore * weights.skill +
    experienceScore * weights.experience +
    reliabilityScore * weights.reliability +
    wageScore * weights.wage +
    proximityScore * weights.proximity
  );

  return {
    score: Math.round(totalScore * 100) / 100,
    reasons: generateReasons(worker, job, {
      skillScore, experienceScore, reliabilityScore, wageScore, proximityScore, distance
    })
  };
};

const generateReasons = (worker, job, scores) => {
  const reasons = [];
  const matchedSkills = job.required_skills.filter(s => worker.skills.includes(s));
  reasons.push(`${matchedSkills.length} of ${job.required_skills.length} skills match (${Math.round(scores.skillScore)}%)`);
  reasons.push(`${worker.experience_years} years experience`);
  reasons.push(`Reliability: ${worker.reliability_score}/100`);
  reasons.push(`Wage ₹${job.wage_amount} vs expected ₹${Math.round((worker.expected_wage_min + worker.expected_wage_max) / 2)}`);
  reasons.push(`${scores.distance.toFixed(1)} km away`);
  return reasons;
};
```

- [ ] Hard filter: availability, skills overlap, distance <= 50km, verified
- [ ] Weighted scoring: skill (30%), experience (15%), reliability (25%), wage (15%), proximity (15%)
- [ ] Generate explainable match reasons
- [ ] Return top candidates ranked by score

### 3.3 Job Applications
- [ ] Worker applies to job (POST /api/worker/jobs/:id/apply)
- [ ] Get worker's applications (GET /api/worker/applications)
- [ ] Employer views matched workers (GET /api/jobs/:id/matches)
- [ ] Employer hires worker (POST /api/jobs/:id/hire/:workerId)
- [ ] Update application status

---

## Phase 4: Payments & Ratings (Week 7)

### 4.1 Payment System
- [ ] Employer initiates payment (POST /api/payments/initiate)
- [ ] Record payment method (UPI / offline)
- [ ] Calculate 5% platform commission
- [ ] Worker confirms receipt (PUT /api/payments/:id/confirm)
- [ ] Dispute flow

### 4.2 Rating System
- [ ] Rate after job completion (POST /api/ratings)
- [ ] 1-5 stars + text review
- [ ] Update worker reliability_score based on ratings
- [ ] Prevent duplicate ratings for same job

---

## Phase 5: Admin & Notifications (Week 8)

### 5.1 Admin Panel
- [ ] Dashboard with stats (workers, employers, jobs, revenue)
- [ ] Verification queue (pending documents)
- [ ] Approve/reject documents
- [ ] Worker management (list, view, disable)
- [ ] Job monitoring
- [ ] Dispute management

### 5.2 Email Notifications
- [ ] New job match notification
- [ ] Application received
- [ ] Hired notification
- [ ] Payment confirmation
- [ ] Verification status update

---

## Phase 6: Polish & Deploy (Week 9)

### 6.1 Frontend Pages
- [ ] Landing page
- [ ] Login / Register (role selection)
- [ ] Worker Dashboard (profile, jobs, applications, history)
- [ ] Employer Dashboard (profile, create job, matches, active jobs)
- [ ] Admin Panel (verification, management, analytics)

### 6.2 Responsive Design
- [ ] Mobile-friendly layouts
- [ ] Touch-friendly inputs
- [ ] Responsive navigation

### 6.3 Deployment
- [ ] Deploy backend to Render
- [ ] Deploy frontend to Vercel
- [ ] Set up environment variables
- [ ] Test production endpoints

---

## API Endpoints Summary

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register with role |
| POST | /api/auth/login | Login, get JWT |

### Worker
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/worker/profile | Get own profile |
| PUT | /api/worker/profile | Update profile |
| POST | /api/worker/documents | Upload docs |
| GET | /api/worker/jobs | Available jobs |
| POST | /api/worker/jobs/:id/apply | Apply to job |
| GET | /api/worker/applications | My applications |

### Employer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/employer/profile | Get own profile |
| PUT | /api/employer/profile | Update profile |
| POST | /api/jobs | Create job |
| GET | /api/jobs | My jobs |
| GET | /api/jobs/:id/matches | AI matched workers |
| POST | /api/jobs/:id/hire/:workerId | Hire worker |
| PUT | /api/jobs/:id/status | Update status |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/initiate | Start payment |
| PUT | /api/payments/:id/confirm | Confirm payment |

### Ratings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ratings | Rate worker |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/verifications | Pending docs |
| PUT | /api/admin/verifications/:id | Approve/reject |
| GET | /api/admin/workers | All workers |
| GET | /api/admin/jobs | All jobs |
| GET | /api/admin/analytics | Platform stats |

---

## Development Checklist

- [ ] Phase 1: Foundation (Week 1-2)
- [ ] Phase 2: Database & Profiles (Week 3-4)
- [ ] Phase 3: Jobs & AI Matching (Week 5-6)
- [ ] Phase 4: Payments & Ratings (Week 7)
- [ ] Phase 5: Admin & Notifications (Week 8)
- [ ] Phase 6: Polish & Deploy (Week 9)
