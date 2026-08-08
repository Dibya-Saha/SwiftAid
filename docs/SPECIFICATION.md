# DRMS Specification

Consolidated reference for the DRMS (Disaster Relief Management System). This file merges the former `PROJECT_ARCHITECTURE.md`, `API_CONVENTIONS.md`, `BUSINESS_RULES.md`, `ROLE_PERMISSIONS.md`, `FEATURE_ROADMAP.md`, and `DRMS-FEATURES.md`. Authoritative table definitions live in `DATABASE_SCHEMA.md`.

---

## 1. Project Architecture

### System Overview

DRMS is a two-process application:

- `backend/` is a Node.js and Express REST API.
- `frontend/` is a React 18 application served by Vite.
- PostgreSQL is the persistent data store.

The root `npm run dev` script starts the backend on port `5000` and the frontend on port `5173` concurrently.

### Backend Structure

```text
backend/
  src/
    server.js              Express app, middleware, route mounting
    db.js                  Shared PostgreSQL connection pool
    middleware/auth.js     JWT authentication and role checks
    routes/                HTTP route definitions
    controllers/           Request validation, business logic, DB calls
    sqls/                  Named SQL query-string constants used by controllers
```

`server.js` enables CORS and JSON parsing, exposes `GET /api/health`, mounts resource routes, and starts the HTTP server. `db.js` exports one `pg.Pool`; controllers reuse that pool instead of opening independent connections.

### Frontend Structure

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

### Request Flow

1. A page or component calls an exported function from `frontend/src/utils/api.js`.
2. The shared `request()` function prefixes the relative `/api` base URL (proxied by Vite to `http://localhost:5000/api` during dev), serializes JSON bodies, and adds the stored bearer token.
3. Express parses the request through `express.json()` and matches the mounted route in `backend/src/server.js`.
4. Route middleware authenticates the token and, where required, checks the role.
5. The controller validates input, runs parameterized SQL using `db.js`, and returns JSON.
6. The frontend parses the JSON response, updates component state, or displays the returned error message.

### Authentication Flow

1. Registration sends `POST /api/auth/register` with profile fields.
2. The auth controller hashes the password with bcrypt and creates a user record.
3. Login sends `POST /api/auth/login` with email and password.
4. The controller verifies the password and signs a JWT containing `user_id`, name, email, and role. The configured default expiration is eight hours.
5. `frontend/src/utils/auth.js` stores the token and user in `localStorage` under `drms_token` and `drms_user`.
6. `api.js` sends `Authorization: Bearer <token>` on later requests.
7. `requireAuth` verifies the token and sets `req.user`; `requireRole` enforces role-specific access.
8. `ProtectedRoute` prevents unauthenticated users or users with the wrong role from opening dashboards in the browser.

### Route Organization

Routes are mounted under `/api`:

| Mount | Route file |
|---|---|
| `/api/auth` | `authRoutes.js` |
| `/api/disasters` | `disasterRoutes.js` |
| `/api/teams` | `teamRoutes.js` |
| `/api/users` | `userRoutes.js` |

The complete endpoint list is in section 2 (API Conventions).

### Controller Responsibilities

Controllers import named query constants from `sqls/` and execute them against the shared pool from `db.js`:

- `authController.js`: validates registration and login, hashes or verifies passwords, signs JWTs, and returns the current profile.
- `userController.js`: lists unassigned users whose role is volunteer.
- `disasterController.js`: creates disasters and reusable locations in a transaction, lists disasters with locations, and updates status.
- `teamController.js`: creates teams and members transactionally with single-team enforcement, lists memberships or pending teams, records admin approval or rejection, handles volunteer resignation, and handles leader disbanding.

### Database Access Pattern

Controllers import the shared pool from `backend/src/db.js` and use parameterized PostgreSQL queries. Multi-step disaster and team writes use `pool.connect()`, `BEGIN`, `COMMIT`, `ROLLBACK`, and `client.release()`.

### Implemented Modules

- Authentication and user registration/login
- JWT and role-based authorization
- Role dashboards for admin, donor, team, and volunteer
- Disaster creation, listing, and status updates
- Location creation and reuse through `disaster_locations`
- Team creation with volunteer membership (one team per person)
- Volunteer resignation and leader team disbanding
- Admin team approval, rejection, and full team registry
- Volunteer availability listing

Shelters, warehouses, items, inventory, victims, donations, relief requests, request items, and distributions exist in the database design but do not yet have backend routes/controllers or frontend workflows.

### Known Schema Compatibility Note

The supplied schema defines `users.full_name`, while the current authentication SQL uses `users.name` and aliases it to `full_name`. This documentation treats the supplied DDL as the database source of truth and records the mismatch for a future application-code correction.

---

## 2. API Conventions

### Base URL

During development the frontend uses a relative `/api` base URL that Vite proxies to `http://localhost:5000/api` (see `frontend/vite.config.js`). This keeps requests same-origin and avoids CORS. The frontend centralizes all requests in `frontend/src/utils/api.js`.

### Route Naming

- Use plural resource nouns: `/disasters`, `/teams`, `/users`.
- Group routes under a resource mount such as `/api/disasters`.
- Use HTTP methods to describe operations: `GET` for reads, `POST` for creation or actions, and `PATCH` for partial updates.
- Use path parameters for resource identifiers: `/disasters/:id/status`.
- Use explicit action suffixes for team decisions: `/teams/:id/approve` and `/teams/:id/reject`.
- Keep authentication routes under `/api/auth`.

### Current Routes

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Authenticate an account |
| `GET` | `/auth/me` | Load the authenticated profile |
| `GET` | `/disasters` | List disasters and locations |
| `POST` | `/disasters` | Create a disaster |
| `PATCH` | `/disasters/:id/status` | Update disaster status |
| `GET` | `/users/volunteers` | List available volunteers |
| `POST` | `/teams` | Create a team |
| `GET` | `/teams` | List all teams (admin) |
| `GET` | `/teams/mine` | List the caller's teams |
| `GET` | `/teams/pending` | List teams awaiting review |
| `POST` | `/teams/:id/approve` | Approve a team |
| `POST` | `/teams/:id/reject` | Reject a team |
| `DELETE` | `/teams/:id/members/me` | Resign the caller from a team |
| `DELETE` | `/teams/:id` | Leader disbands their own team |

### Controller Responsibilities

Controllers own request validation, business rules, database calls, transaction boundaries, and response construction. Route files should remain focused on mapping paths to middleware and controller functions.

Controllers should read:

- JSON input from `req.body`.
- URL identifiers and actions from `req.params`.
- Authenticated identity and role from `req.user` after `requireAuth`.

### Database Access

- Import the shared pool from `backend/src/db.js`.
- Use parameterized placeholders such as `$1`, `$2`, and values arrays.
- Use a checked-out client and explicit `BEGIN`/`COMMIT`/`ROLLBACK` for related multi-table writes.
- Always release a checked-out client in `finally`.
- Never create a separate pool in a controller.

### Authentication Conventions

Protected requests use:

```http
Authorization: Bearer <jwt>
```

`requireAuth` verifies the token with `JWT_SECRET`, normalizes `req.user.role` to lowercase, and returns `401` when the token is missing, invalid, or expired. `requireRole('admin')` or another role guard returns `403` when the caller lacks permission.

### Response Format

Successful responses are JSON objects with resource-oriented keys:

```json
{ "user": {}, "token": "..." }
```

```json
{ "disasters": [] }
```

```json
{ "teams": [] }
```

Created resources return `201`; normal reads and updates return `200`.

### Error Handling

Validation errors return `400` with `{ "message": "..." }`. Missing or invalid authentication returns `401`; insufficient role permission returns `403`; missing resources return `404`; unique conflicts return `409`; unexpected database or server errors return `500` with a safe message. Controllers log internal errors server-side and should not expose credentials or SQL details to clients.

### Frontend Request Behavior

`api.js` sets `Content-Type: application/json`, adds the stored token, parses JSON, and throws `data.message` when `res.ok` is false. New frontend API functions should follow the same wrapper instead of calling `fetch()` directly from pages.

---

## 3. Business Rules

Status values and workflow behavior below distinguish what is implemented in the current application from what is only supported by the database design.

### Disaster Workflow

**Implemented**

- Only an authenticated admin can create a disaster.
- `title`, `division`, and `district` are required.
- Optional `upazila` and `union` values are accepted.
- New disasters start with `ACTIVE` and the current date as `start_date`.
- The creator is stored in `created_by_admin_id`.
- Admins may update status through `ACTIVE`, `ONGOING`, `RESOLVED`, and `CLOSED`.
- Any authenticated user may list disasters.

**Future**

- Disaster-specific shelter, victim, request, and distribution coordination.
- Validation that status changes follow only the next lifecycle state.

### Team Approval Workflow

**Implemented**

- Only users with role `team` can register a team.
- Supported team types are `medical`, `rescue`, `logistics`, `distribution`, and `general`.
- The creator becomes the leader and is inserted into `team_members` with role `leader`.
- Selected users must have role `volunteer` and cannot already belong to a team.
- One person may belong to only one team at a time. This is enforced in the `createTeam` transaction and by the `team_members_user_id_key` unique index.
- A team-role user who already belongs to a team (as leader or member) cannot create another team.
- New teams start as `pending_approval`.
- Only admins can view pending teams or approve/reject them. Rejecting a team releases all of its members.
- The reviewing admin is stored in `approved_by_admin_id`.
- A volunteer can resign from their team via `DELETE /api/teams/:id/members/me`; they become available and may join another team.
- Team leaders cannot resign or transfer ownership. They can only disband their team via `DELETE /api/teams/:id`, which releases all members. A disbanded team keeps its row with status `disbanded` so the leader and admins can still see it.

**Future**

- Team reassignment and distribution status updates.

### Location Handling Workflow

**Implemented**

- Disaster creation searches for an existing matching location.
- Matching uses division, district, upazila, and union values, including null-safe comparisons.
- A missing location is inserted before the disaster is created.
- The disaster and location are linked through `disaster_locations`.
- Disaster creation is transactional; a failure rolls back all related inserts.

**Future**

- Independent location administration and validation against a geographic registry.

### Donation Workflow

**Implemented**

- The database can record a donor, warehouse, item, positive quantity, and timestamp.

**Future**

- Donor-facing donation form and `donations` API.
- Validation that the donor has role `donor`.
- Updating warehouse `inventory` after a donation.
- Donation review, cancellation, and audit history.

### Relief Request Workflow

**Implemented**

- The database models a shelter request, requesting admin, status, and timestamp.
- Requested items and dispatched quantities are modeled by `request_items`.

**Future**

- Shelter registration and request creation.
- Admin approval or rejection of requests.
- Item-level quantity validation and request status transitions.

### Distribution Workflow

**Implemented**

- The database links a request, warehouse, assigned team, assigning admin, status, and timestamp.

**Future**

- Admin assignment endpoint and team distribution dashboard.
- Inventory decrement when items are dispatched.
- Delivery completion, partial fulfillment, and delivery confirmation.

### Inventory Workflow

**Implemented**

- The database stores one inventory row per warehouse-item pair.
- Quantity defaults to zero and cannot be negative.
- The `(warehouse_id, item_id)` unique constraint prevents duplicate stock rows.

**Future**

- Warehouse and item management endpoints.
- Stock receipts from donations.
- Reservation and decrement logic for distributions.
- Low-stock and reconciliation reporting.

---

## 4. Role Permissions

The database stores role values as text. The current application uses lowercase values: `admin`, `team`, `volunteer`, and `donor`. This section uses uppercase labels for readability.

### Current Permissions

| Capability | ADMIN | TEAM | VOLUNTEER | DONOR |
|---|--:|--:|--:|--:|
| Access own dashboard | Yes | Yes | Yes | Yes |
| Register account | Public | Public | Public | Public |
| View disasters | Yes | Yes | Yes | Yes |
| Create disasters | Yes | No | No | No |
| Update disaster status | Yes | No | No | No |
| View own team memberships | Yes | Yes | Yes | Yes |
| Create a response team | No | Yes | No | No |
| Select available volunteers | Yes, through team review UI | Yes | No | No |
| View pending teams | Yes | No | No | No |
| Approve or reject teams | Yes | No | No | No |
| Disband an owned team | No | Yes | No | No |
| Resign from a team | No | No | Yes | No |
| View available volunteers API | Yes | Yes | Yes | Yes |

### Current Endpoint Access

| Endpoint | Required access |
|---|---|
| `POST /api/auth/register` | Public |
| `POST /api/auth/login` | Public |
| `GET /api/auth/me` | Valid bearer token |
| `GET /api/disasters` | Any authenticated user |
| `POST /api/disasters` | Authenticated `admin` |
| `PATCH /api/disasters/:id/status` | Authenticated `admin` |
| `POST /api/teams` | Authenticated `team` |
| `GET /api/teams` | Authenticated `admin` |
| `GET /api/teams/mine` | Any authenticated user |
| `GET /api/teams/pending` | Authenticated `admin` |
| `POST /api/teams/:id/approve` | Authenticated `admin` |
| `POST /api/teams/:id/reject` | Authenticated `admin` |
| `DELETE /api/teams/:id/members/me` | Authenticated `volunteer` |
| `DELETE /api/teams/:id` | Authenticated `team` |
| `GET /api/users/volunteers` | Any authenticated user |

### Dashboard Access

- `ADMIN`: `/admin`, protected by `ProtectedRoute role="admin"`.
- `TEAM`: `/team`, protected by `ProtectedRoute role="team"`.
- `VOLUNTEER`: `/volunteer`, protected by `ProtectedRoute role="volunteer"`.
- `DONOR`: `/donor`, protected by `ProtectedRoute role="donor"`.

Unauthenticated users are redirected to `/login`. Authenticated users attempting another role's dashboard are redirected to their own role home.

### Future Permissions

- `ADMIN`: manage shelters, warehouses, items, inventory, victims, requests, distributions, and workflow approvals.
- `TEAM`: view assigned distributions and update permitted delivery status fields.
- `VOLUNTEER`: view team assignments and operational tasks assigned through approved teams.
- `DONOR`: create and view their own donations and donation status.
- All future permissions must be enforced in backend middleware, not only by hiding frontend controls.

---

## 5. Feature Roadmap

### Completed

- **Authentication:** registration with bcrypt hashing, JWT login, eight-hour token expiration, profile lookup via `/api/auth/me`, logout, and protected frontend routes.
- **Users:** role values for admin/donor/team/volunteer, volunteer availability endpoint, role-specific dashboard routing.
- **Disasters:** admin creation, listing for authenticated users, status updates through `ACTIVE`, `ONGOING`, `RESOLVED`, `CLOSED`.
- **Locations:** creation during disaster creation, reuse on matching geographic values, junction records, location data in listings.
- **Teams:** creation by team-role users, supported types, free-volunteer selection, automatic leader/member rows, pending approval, admin approval/rejection, membership listing, single-team enforcement, volunteer resignation, leader disbanding.

### Suggested Implementation Order

1. **Shelters** — CRUD, capacity validation, admin ownership, location selection, shelter listing. Foundational for victims and relief requests.
2. **Warehouses and Items** — warehouse management and the item catalog; prerequisites for inventory and donations.
3. **Inventory** — stock upsert/adjustment using the unique `(warehouse_id, item_id)` constraint, quantity validation, transactions.
4. **Donations** — donors submit item donations to a warehouse; record donation and update inventory in one transaction; donor history and admin visibility.
5. **Relief Requests** — shelter administrators create requests with `request_items`; statuses, approval rules, item quantity validation.
6. **Distributions** — admins assign approved requests to warehouses and approved teams; update dispatched quantities and inventory transactionally; team delivery workflows.

### Recommended Module Pattern

For each roadmap module, implement:

1. Backend controller with validation and parameterized SQL.
2. Backend route file mounted from `server.js`.
3. Authentication and role middleware on every protected route.
4. Frontend API functions in `frontend/src/utils/api.js`.
5. Role-appropriate page or dashboard components.
6. Transaction and error tests for important multi-table operations.

### Dependencies and Risks

- Shelters must exist before victims and relief requests can be assigned.
- Warehouses and items must exist before inventory or donations.
- Inventory must be correct before distributions can decrement stock.
- Team approval should precede team assignment to a distribution.
- Status values are currently unconstrained text for several future tables; application validation should be added consistently.
- The supplied schema uses `users.full_name`; current auth SQL references `users.name`. Resolve this mismatch before extending user-related features.

---

## 6. Module Feature Summary

**Disaster module (admin-only):** create disasters with title/division/district/upazila/union; auto-create and link a location; any logged-in user can list; admins update status with a dropdown (AdminDashboard.jsx). Inserts into `locations`, `disasters`, and `disaster_locations`.

**Location module (auto-generated via disasters):** locations created on the fly, reused when geographic values match, linked via the `disaster_locations` junction.

**Team module (team-role users + admin approval):** leaders register a team, pick free volunteers from a checkbox list, become `leader`, volunteers become `member`. One team per person. Leaders see approval status and can disband; volunteers can resign. Admins review pending teams (approve/reject) and see the full team registry with a status filter. UI lives in TeamDashboard.jsx and AdminDashboard.jsx.

**User/Auth module:** registration with bcrypt, JWT login (8 hours), role-based dashboards, profile fetch with token validation.
