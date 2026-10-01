# SwiftAid Disaster Relief Management System

SwiftAid is a full-stack disaster relief coordination platform. It gives administrators, donors, response teams, and volunteers a shared operational view of disasters, shelters, victims, supplies, relief requests, donations, and deliveries.

The application is designed for real-time coordination while keeping permissions and stock changes enforced on the server and in PostgreSQL.

## Highlights

- Email verification, bcrypt password hashing, JWT authentication, and role-based authorization
- Separate workflows for `admin`, `donor`, `team`, and `volunteer` users
- Disaster registration with reusable geographic locations and map coordinates
- Shelter registration, victim assignment, and shelter-capacity validation
- Warehouse and shelter inventory management with add/remove operations
- Donation workflows that update donation records and stock atomically
- Relief requests with item-level requested, dispatched, remaining, and fulfillment status
- Team registration, volunteer membership, admin approval, and rejection remarks
- Warehouse-to-shelter distribution assignment and delivery tracking
- PostgreSQL functions, procedures, triggers, constraints, and inventory audit logs
- Responsive React dashboards with Leaflet maps

## Screenshots

The following screenshots are stored in [`demo/`](demo/):

| Screen                      | Preview                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| Sign in                     | ![SwiftAid sign-in screen](demo/Screenshot%202026-10-02%20030238.png)   |
| Team approval               | ![Team approval dashboard](demo/Screenshot%202026-10-02%20030604.png)   |
| Shelters and warehouses map | ![Shelter and warehouse map](demo/Screenshot%202026-10-02%20030722.png) |
| Victim registry             | ![Victim registry](demo/Screenshot%202026-10-02%20030754.png)           |
| Warehouse inventory         | ![Warehouse inventory](demo/Screenshot%202026-10-02%20030819.png)       |
| Relief requests             | ![Relief request management](demo/Screenshot%202026-10-02%20030844.png) |
| Distribution assignment     | ![Distribution assignment](demo/Screenshot%202026-10-02%20030909.png)   |
| Email verification          | ![Email verification](demo/Screenshot%202026-10-02%20040133.png)        |

The repository also contains the animated project mascot at [`panda.svg`](panda.svg).

## Architecture

```text
Browser
	React 18 + Vite + React Router + Leaflet
					|
					| JSON API through the Vite /api proxy
					v
Backend
	Node.js + Express + JWT + bcrypt + Nodemailer
					|
					| parameterized SQL, transactions, functions, procedures, triggers
					v
PostgreSQL
```

The repository is split into two applications:

- `backend/` contains the Express API, controllers, routes, middleware, SQL query modules, and database migrations.
- `frontend/` contains the React application, role-aware routes, dashboards, shared components, and styles.
- `DRMS_SCHEMA.sql` contains the base PostgreSQL schema.
- `backend/migrations/` contains incremental database changes and database objects.
- `docs/DATABASE_SCHEMA.md` documents the tables and relationships.

## Technology Stack

### Frontend

- React 18
- Vite
- React Router DOM
- React Leaflet and Leaflet heat maps
- CSS with a dark operations-control-room visual style

### Backend

- Node.js
- Express
- PostgreSQL via `pg`
- bcrypt for password hashing
- JSON Web Tokens for authentication
- Nodemailer for email verification
- Raw parameterized SQL; no ORM is used

## User Roles

| Role      | Main capabilities                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| Admin     | Manage disasters, teams, shelters, warehouses, items, victims, inventory, donations, relief requests, and distributions |
| Donor     | Donate supplies to warehouses or eligible relief requests and view personal donation history                            |
| Team      | Create response teams, select volunteers, view team distributions, and update delivery progress                         |
| Volunteer | View disasters, join available teams through team workflows, and manage team membership                                 |

Authorization is enforced by backend middleware. Frontend route protection only controls the user experience and is not the security boundary.

## Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL 13 or newer
- A PostgreSQL database, such as `drms`
- SMTP credentials if email verification is enabled

## Installation

Clone the repository and install all workspace dependencies from the project root:

```bash
npm install
```

Create the database, then apply the base schema:

```bash
psql -U postgres -d drms -f DRMS_SCHEMA.sql
```

Apply the migration files in `backend/migrations/` in numeric order. The migrations are intended to be run once against the same database used by the backend. Navicat users can open each `.sql` file in a query window and execute them in order.

## Environment Variables

Create `backend/.env` and configure the PostgreSQL and JWT settings:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drms
DB_USER=postgres
DB_PASSWORD=your_database_password
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
```

For email verification, also configure the SMTP variables expected by the mail service in the backend. Do not commit `.env` files, passwords, JWT secrets, or API keys.

## Running the Application

Start both the API and frontend from the repository root:

```bash
npm run dev
```

Or run each process separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Default URLs:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health check: http://localhost:5000/api/health

The Vite development server proxies `/api` requests to the backend.

Production-style commands:

```bash
npm run build -w frontend
npm start -w backend
```

## Authentication Flow

1. A user registers with a name, email, password, phone, and role.
2. The backend hashes the password with bcrypt and stores only the hash.
3. The user verifies the six-digit email code when verification is enabled.
4. Login verifies the submitted password with `bcrypt.compare` and creates a JWT.
5. The frontend stores the session token and user profile in local storage.
6. Protected API requests send `Authorization: Bearer <token>`.
7. `requireAuth` validates the token and `requireRole` enforces permissions.

Passwords cannot be decrypted. A bcrypt hash contains a random salt, so the same password produces different hashes. Login works by comparing the entered password with the stored hash.

## API Overview

All API routes are prefixed with `/api`.

| Area              | Main endpoints                                                                         |
| ----------------- | -------------------------------------------------------------------------------------- |
| Authentication    | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/verify-email`, `/auth/resend-code` |
| Disasters         | `/disasters`, `/disasters/:id/status`                                                  |
| Teams             | `/teams`, `/teams/mine`, `/teams/pending`, `/teams/:id/approve`, `/teams/:id/reject`   |
| Shelters          | `/shelters`, `/shelters/:id`                                                           |
| Warehouses        | `/warehouses`, `/warehouses/:id`                                                       |
| Items             | `/items`, `/items/:id`                                                                 |
| Victims           | `/victims`, `/victims/:id`                                                             |
| Inventory         | `/inventory`, `/inventory/adjust`, `/inventory/:id`                                    |
| Donations         | `/donations`, `/donations/mine`, `/donations/:id`                                      |
| Relief requests   | `/relief-requests`, `/relief-requests/:id/donate`                                      |
| Shelter inventory | `/shelter-inventory`                                                                   |
| Distributions     | `/distributions` and distribution status actions                                       |

Successful responses and errors use JSON. Common error statuses are `400` for invalid input, `401` for missing or invalid authentication, `403` for forbidden actions, `404` for missing resources, `409` for conflicts, and `500` for unexpected server errors.

## Database and Transaction Safety

The backend uses a shared PostgreSQL connection pool and named SQL modules under `backend/src/sqls/`. User input is passed as PostgreSQL parameters such as `$1`, `$2`, and `$3`; it is not concatenated into SQL strings.

Important database safeguards include:

- Unique constraints for user contact details and team membership
- Foreign keys and check constraints for valid relationships and quantities
- Transactions for donations, inventory changes, distributions, and relief workflows
- Row locks for concurrent stock and request updates
- Trigger-based inventory audit logs
- Trigger validation preventing dispatched quantities from exceeding requests
- Trigger synchronization of relief-request fulfillment status
- Stored functions and procedures for capacity, availability, summaries, donations, and delivery operations

## Useful Project Files

```text
backend/src/server.js                 Express application and route mounting
backend/src/db.js                     PostgreSQL connection pool
backend/src/middleware/auth.js        JWT and role middleware
backend/src/controllers/              Request validation and business workflows
backend/src/routes/                   API endpoint definitions
backend/src/sqls/                     Parameterized SQL and database objects
backend/migrations/                   Incremental schema and database changes
frontend/src/App.jsx                  Frontend routes and role dashboards
frontend/src/utils/api.js             Centralized API client
frontend/src/utils/auth.js            Token and session storage
frontend/src/components/              Shared dashboard components
frontend/src/pages/                   Authentication and role-specific pages
DRMS_SCHEMA.sql                       Base database schema
docs/DATABASE_SCHEMA.md               Table and relationship reference
```

## Development Notes

- Keep backend and frontend changes in their respective directories.
- Add reusable frontend API calls to `frontend/src/utils/api.js`.
- Keep authentication and authorization checks on the backend.
- Use transactions when one operation changes multiple tables.
- Preserve soft-deleted records where the existing module uses `archived_at`.
- Never commit credentials or local environment files.

## Course Context

This project was developed for the Bangladesh University of Engineering and Technology CSE 216 Database Sessional course. The project guidelines require normalized relational design, raw SQL, secure password hashing, access-controlled API routes, validation, and a functional role-aware frontend. See [`PROJECT_GUIDELINES.md`](PROJECT_GUIDELINES.md) for the evaluation requirements.
