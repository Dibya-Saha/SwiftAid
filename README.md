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

## Setup From a Fresh Clone

The commands below work from PowerShell, Command Prompt, Git Bash, or a Unix-like shell. Run them from the repository root.

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-folder>
```

Check that the root contains `DRMS_SCHEMA.sql`, `backend/`, and `frontend/` before continuing.

### 2. Check prerequisites

```bash
node --version
npm --version
psql --version
```

Install Node.js 18 or newer and PostgreSQL 13 or newer if any command is missing. Make sure the PostgreSQL service is running.

### 3. Install dependencies

Install the root workspace dependencies. This installs both the backend and frontend packages:

```bash
npm install
```

### 4. Create the PostgreSQL database

Create a database named `drms` using pgAdmin, Navicat, or `psql`:

```bash
createdb -U postgres drms
```

If the database already exists, keep it and skip this command. The database name, user, and password must match `backend/.env`.

### 5. Apply the database schema and migrations

Apply the base schema first:

```bash
psql -U postgres -d drms -f DRMS_SCHEMA.sql
```

Then run the files in `backend/migrations/` in numeric order, from `001_...sql` through `028_...sql`. Do not run the files ending in `_down.sql`; those are rollback scripts.

Navicat users can open `DRMS_SCHEMA.sql`, execute it, then open each numbered migration in order and execute it against the `drms` database. Migrations should normally be applied only once to a database.

### 6. Configure the backend environment

Create a file named `backend/.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drms
DB_USER=postgres
DB_PASSWORD=your_database_password
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h
SMTP_USER=your_gmail_address@gmail.com
SMTP_APP_PASSWORD=your_gmail_app_password
```

`SMTP_USER` and `SMTP_APP_PASSWORD` are required for the email verification code to be delivered. For Gmail, enable 2-Step Verification and create an App Password; do not use the normal Gmail account password.

Never commit `.env`, passwords, JWT secrets, or API keys. `.env` is ignored by Git.

### 7. Start the whole project

Start the backend and frontend together from the repository root:

```bash
npm run dev
```

Or use two terminals:

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

Open http://localhost:5173. The backend runs at http://localhost:5000, and the API health check is available at http://localhost:5000/api/health.

The Vite development server proxies `/api` requests to `http://localhost:5000`.

### 8. Verify the installation

Check the backend and database connection:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "db": "connected"
}
```

Then register a user at http://localhost:5173/register, verify the email code, and sign in. The available dashboards depend on the selected role.

### Production-style commands

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
.
├── DRMS_SCHEMA.sql                   Base PostgreSQL schema
├── README.md                         Setup, usage, and troubleshooting guide
├── PROJECT_GUIDELINES.md             Course project requirements
├── package.json                      Root workspace scripts
├── demo/                             Application screenshots
├── docs/
│   ├── AGENTS.md                     Architecture and contribution guidance
│   └── DATABASE_SCHEMA.md             Table and relationship reference
├── backend/
│   ├── package.json                  Backend scripts and dependencies
│   ├── migrations/                   Numbered schema and database-object migrations
│   └── src/
│       ├── server.js                 Express application and route mounting
│       ├── db.js                     PostgreSQL connection pool
│       ├── middleware/auth.js        JWT and role middleware
│       ├── controllers/              Validation and business workflows
│       ├── routes/                   API endpoint definitions
│       ├── sqls/                     Parameterized SQL and database objects
│       └── utils/mailer.js           Gmail SMTP verification mailer
└── frontend/
		├── package.json                  Frontend scripts and dependencies
		├── vite.config.js                Vite server and /api proxy
		└── src/
				├── App.jsx                   Frontend routes and role dashboards
				├── components/               Shared dashboard components
				├── pages/                    Authentication and role-specific pages
				├── styles/                   Page-specific styles
				├── styles.css                Shared application styles
				└── utils/
						├── api.js                Centralized API client
						└── auth.js                Token and session storage
```

## Troubleshooting

### `npm run dev` does not start

- Confirm the terminal is in the repository root, not inside `backend/` or `frontend/`.
- Run `npm install` again from the root.
- Check that Node.js is version 18 or newer.
- Start the processes separately with `npm run dev:backend` and `npm run dev:frontend` to see which side is failing.

### `ECONNREFUSED` or `database unreachable`

- Confirm PostgreSQL is running.
- Confirm `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in `backend/.env`.
- Test the same credentials directly:

  ```bash
  psql -h localhost -p 5432 -U postgres -d drms
  ```

- Confirm `DRMS_SCHEMA.sql` and all numbered migrations were executed against `drms`.

### `relation does not exist` or missing function/procedure errors

The base schema or a migration is missing. Apply `DRMS_SCHEMA.sql`, then apply every numbered migration in order. Do not apply `_down.sql` files. Restart the backend after the database objects are installed.

### Port `5000` or `5173` is already in use

Stop the process using the port, or change the backend `PORT` and the frontend proxy target together. The frontend proxy in `frontend/vite.config.js` must point to the same port used by the backend.

### Registration succeeds but no verification email arrives

- Confirm `SMTP_USER` and `SMTP_APP_PASSWORD` are present in `backend/.env`.
- For Gmail, use a 16-character App Password rather than the normal account password.
- Restart the backend after changing `.env`.
- Check the backend terminal for `[auth/register] email failed`.
- Use **Resend code** after the 60-second resend cooldown.

### Login says email verification is required

Open `/verify-email`, enter the six-digit code sent by email, and verify the account before signing in. If the code expired, request a new one. Verification codes expire after 15 minutes and have a limited number of attempts.

### Login returns `Invalid email or password`

Confirm that the email is registered and that the password is the original plain password used during registration. Do not compare two bcrypt hash strings directly; bcrypt uses a different salt each time. The backend must verify passwords with `bcrypt.compare`.

### API requests return `401` or `403`

- `401` means the JWT is missing, invalid, or expired. Sign out and sign in again.
- `403` means the account is authenticated but its role is not allowed to perform that action.
- Do not manually change the role in browser storage; authorization is enforced by the backend token and database user role.

### Map tiles or geocoding do not load

Check the browser network panel and confirm the frontend has internet access. The application uses Leaflet map tiles and the backend geocoding route; the rest of the application can still run without map data.

### Changes are not visible in the browser

Confirm the frontend is running on http://localhost:5173, refresh the page, and check the browser console. If the API changed, restart the backend. If dependencies changed, stop the dev server and run `npm install` again.

## Development Notes

- Keep backend and frontend changes in their respective directories.
- Add reusable frontend API calls to `frontend/src/utils/api.js`.
- Keep authentication and authorization checks on the backend.
- Use transactions when one operation changes multiple tables.
- Preserve soft-deleted records where the existing module uses `archived_at`.
- Never commit credentials or local environment files.

## Course Context

This project was developed for the Bangladesh University of Engineering and Technology CSE 216 Database Sessional course. The project guidelines require normalized relational design, raw SQL, secure password hashing, access-controlled API routes, validation, and a functional role-aware frontend. See [`PROJECT_GUIDELINES.md`](PROJECT_GUIDELINES.md) for the evaluation requirements.
