# TheWallet

TheWallet is a student-focused personal finance app for tracking accounts, spending, subscriptions, budgets, academic costs, dining dollars, roommate splits, and financial alerts from one dashboard.

## Features

- **Dashboard**: Net worth, expense charts, recent transactions, CSV export, spare-change round-up simulation, Venmo handle management, and transaction splitting.
- **Bank connections**: Plaid Link integration for account and transaction syncing, with encrypted access-token storage when `ENCRYPTION_KEY` is configured.
- **Budgets**: Weekly, monthly, quarterly, and semi-annual budget tracking based on real transaction spend.
- **Subscriptions**: Recurring transaction scan and simulated subscription cancellation workflow.
- **Education Hub**: Tuition/aid tracking and dining-dollar daily spend calculation.
- **Roommates**: Shared expense groups, split ledgers, settlement tracking, and transaction-to-expense splitting.
- **Settings**: Profile update, password change, notification preferences, and account deletion.
- **AI Chatbot**: Context-aware financial assistant with Gemini support and a local fallback response.
- **PWA support**: Manifest, icons, service worker production registration, and push notification API hooks.

## Tech Stack

- **Frontend**: Angular 21, SCSS, Chart.js, ng2-charts
- **Backend**: Node.js, Express 5
- **Database/ORM**: Prisma with SQLite
- **Security**: JWT auth, bcrypt password hashing, Helmet, rate limiting, AES-256-GCM secret encryption helper
- **DevOps**: Docker Compose, nginx frontend container, GitHub Actions CI

## Project Structure

```text
.
├── backend/                 Express API, Prisma schema, migrations, seed scripts
├── frontend/                Angular app, PWA assets, nginx config
├── .github/workflows/       CI checks
├── docker-compose.yml       Containerized frontend/backend
├── package.json             Root orchestration scripts
└── README.md
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop, optional for containerized runs

## Environment Setup

Create the backend env file from the example:

```bash
cd backend
cp .env.example .env
```

At minimum, set:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="replace-with-a-long-random-secret"
ENCRYPTION_KEY="replace-with-a-long-random-encryption-secret"
```

Optional integrations:

- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`
- `GEMINI_API_KEY`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

If you configure push notifications, also set `vapidPublicKey` in `frontend/src/environments/environment.ts`.

## Install

From the project root:

```bash
npm run install:all
```

Or install each app separately:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

## Database

Generate Prisma Client and apply migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

For a brand-new local SQLite file on Windows, create the file before the first deploy if Prisma reports a schema engine error:

```powershell
New-Item -ItemType File -Path prisma\dev.db -Force
npx prisma migrate deploy
```

Seed demo data:

```bash
npm run seed
node scripts/seed-academics.js
node scripts/seed-roommates.js
```

Default seeded login:

```text
test@college.edu / password123
```

## Run Locally

Start backend and frontend together from the root:

```bash
npm start
```

Or run them separately:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm start
```

Local URLs:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Docker

```bash
docker-compose up --build
```

Docker serves the frontend at `http://localhost:8080` and the backend at `http://localhost:3000`. The backend mounts your local `./backend/prisma` folder so your `dev.db` database changes persist even when the container stops.

## Verification

Run the full local verification suite:

```bash
npm run verify
```

This runs:

- Backend Node tests
- Prisma schema validation
- Frontend Vitest/Angular tests
- Frontend production build

Individual checks:

```bash
cd backend && npm test
cd backend && npx prisma validate
cd frontend && npm test -- --watch=false
cd frontend && npm run build
```

## API Overview

All API routes are prefixed with `/api/v1`.

- `auth`: register, login, current user, profile update, email verification, onboarding, password change, account deletion
- `accounts`: account list, account transactions, recurring account transactions, round-up simulation
- `academics`: academic terms and dining-dollar safe-spend calculation
- `budgets`: budget list and budget create/update
- `chat`: AI financial assistant
- `connections`: mock bank connection flow
- `plaid`: real Plaid Link token, token exchange, account/transaction sync
- `receipts`: image OCR receipt scanning
- `roommates`: groups, shared expenses, settlements, transaction splitting
- `subscriptions`: subscription scan, list, and cancellation simulation
- `notifications`: web push subscription and test notification

## Notes

- `.env`, local SQLite files, Angular build cache, and IDE metadata are intentionally ignored.
- Push notification keys are no longer hardcoded. Configure VAPID keys through env values.
- Docker is aligned with the current Prisma SQLite setup. If you later move to PostgreSQL, update `schema.prisma`, migrations, Docker Compose, and README together.
