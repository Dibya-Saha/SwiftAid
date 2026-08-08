# Project Architecture

## System Overview

DRMS is a two-process application:

- `backend/` is a Node.js and Express REST API.
- `frontend/` is a React 18 application served by Vite.
- PostgreSQL is the persistent data store.

The root `npm run dev` script starts the backend on port `5000` and the frontend on port `5173` concurrently.

## Backend Structure

```text
backend/
  src/
    server.js              Express app, middleware, route mounting
    db.js                  Shared PostgreSQL connection pool
    middleware/auth.js     JWT authentication and role checks
    routes/                HTTP route definitions
    controllers/           Request validation, business logic, SQL
```

`server.js` enables CORS and JSON parsing, exposes `GET /api/health`, mounts resource routes, and starts the HTTP server. `db.js` exports one `pg.Pool`; controllers reuse that pool instead of opening independent connections.

## Frontend Structure

```text
frontend/src/
  main.jsx                 React entry point
  App.jsx                  Browser routes and dashboard protection
  pages/                   Login, registration, and role dashboards
  components/              Shared dashboard, route, and disaster UI
  utils/api.js             Fetch wrapper and endpoint functions
  utils/auth.js            Local session and role-home helpers
  styles.css               Global visual styles
```

`App.jsx` maps `/admin`, `/donor`, `/team`, and `/volunteer` to role-protected dashboards. Shared dashboard UI calls `/api/auth/me` to refresh the profile.

## Request Flow

1. A page or component calls an exported function from `frontend/src/utils/api.js`.
2. The shared `request()` function prefixes `http://localhost:5000/api`, serializes JSON bodies, and adds the stored bearer token.
3. Express parses the request through `express.json()` and matches the mounted route in `backend/src/server.js`.
4. Route middleware authenticates the token and, where required, checks the role.
5. The controller validates input, runs parameterized SQL using `db.js`, and returns JSON.
6. The frontend parses the JSON response, updates component state, or displays the returned error message.

## Authentication Flow

1. Registration sends `POST /api/auth/register` with profile fields.
2. The auth controller hashes the password with bcrypt and creates a user record.
3. Login sends `POST /api/auth/login` with email and password.
4. The controller verifies the password and signs a JWT containing `user_id`, name, email, and role. The configured default expiration is eight hours.
5. `frontend/src/utils/auth.js` stores the token and user in `localStorage` under `drms_token` and `drms_user`.
6. `api.js` sends `Authorization: Bearer <token>` on later requests.
7. `requireAuth` verifies the token and sets `req.user`; `requireRole` enforces role-specific access.
8. `ProtectedRoute` prevents unauthenticated users or users with the wrong role from opening dashboards in the browser.

## Route Organization

Routes are mounted under `/api`:

| Mount | Route file | Current endpoints |
|---|---|---|
| `/api/auth` | `authRoutes.js` | `POST /register`, `POST /login`, `GET /me` |
| `/api/disasters` | `disasterRoutes.js` | `GET /`, `POST /`, `PATCH /:id/status` |
| `/api/teams` | `teamRoutes.js` | `POST /`, `GET /mine`, `GET /pending`, `POST /:id/approve`, `POST /:id/reject`, `DELETE /:id/members/me`, `DELETE /:id` |
| `/api/users` | `userRoutes.js` | `GET /volunteers` |

## Controller Responsibilities

- `authController.js`: validates registration and login, hashes or verifies passwords, signs JWTs, and returns the current profile.
- `userController.js`: lists unassigned users whose role is volunteer.
- `disasterController.js`: creates disasters and reusable locations in a transaction, lists disasters with locations, and updates status.
- `teamController.js`: creates teams and members transactionally with single-team enforcement, lists memberships or pending teams, records admin approval or rejection, handles volunteer resignation, and handles leader disbanding.

## Database Access Pattern

Controllers import the shared pool from `backend/src/db.js` and use parameterized PostgreSQL queries. Multi-step disaster and team writes use `pool.connect()`, `BEGIN`, `COMMIT`, `ROLLBACK`, and `client.release()`.

## Current Implemented Modules

- Authentication and user registration/login
- JWT and role-based authorization
- Role dashboards for admin, donor, team, and volunteer
- Disaster creation, listing, and status updates
- Location creation and reuse through `disaster_locations`
- Team creation with volunteer membership
- Admin team approval and rejection
- Volunteer availability listing

Shelters, warehouses, items, inventory, victims, donations, relief requests, request items, and distributions exist in the database design but do not currently have backend routes/controllers or frontend workflows.

## Known Schema Compatibility Note

The supplied schema defines `users.full_name`, while the current authentication SQL uses `users.name` and aliases it to `full_name`. This documentation treats the supplied DDL as the database source of truth and records the mismatch for a future application-code correction. No application code is changed by this documentation update.
