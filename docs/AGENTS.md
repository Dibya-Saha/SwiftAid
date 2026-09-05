# AGENTS.md

# DRMS — Disaster Relief Management System

## Project Overview

DRMS (Disaster Relief Management System) is a full-stack web application for coordinating disaster response operations.

The system manages:

- Disaster registration and tracking
- Geographic disaster locations
- Volunteer and response teams
- Shelters and victims
- Warehouses and inventory
- Donations and stock management
- Relief requests
- Distribution operations

## Technology Stack

See [README.md](../README.md) for the authoritative stack (Node.js/Express/PostgreSQL backend, React/Vite frontend).

---

# Read Before Coding

Before implementing ANY feature, read the following files in order:

1. README.md
2. docs/DATABASE_SCHEMA.md
3. docs/AGENTS.md (this file)
4. backend/src/server.js
5. backend/src/db.js
6. backend/src/middleware/auth.js
7. Relevant routes, controllers, pages, and API utility files

Never start coding before reading these files.

---

# Current System Status

## Implemented Modules

### Authentication

- Register
- Login
- JWT Authentication
- Role-based authorization
- User profile

### Users

- Volunteer listing endpoint
- User role handling

### Disasters

- Create disaster
- View disasters
- Update disaster status
- Auto-create and reuse locations

### Teams

- Team creation
- Volunteer assignment
- Team membership
- Team approval workflow
- Team rejection workflow

### Operational Modules

- Shelter CRUD and capacity validation
- Warehouse CRUD and shared location handling
- Item catalog CRUD with controlled categories and units
- Victim registration, disaster linkage, shelter assignment, and capacity checks
- Inventory listing with transactional Add stock and Remove stock operations
- Independent shelter inventory with audited add/remove stock adjustments

### Donations

- Donors can submit one or more items to a warehouse in a single donation.
- Duplicate item IDs are merged by summing their quantities.
- Donation creation updates donation records and warehouse inventory transactionally.
- Donors can view their own donation history.
- Admins can view all donations from the Donations dashboard tab.

### Relief and Distribution

- Admins can create, review, and track shelter relief requests.
- Approved teams can receive warehouse-to-shelter distribution tasks.
- Distribution assignment reserves warehouse stock transactionally.
- Delivered distributions increase shelter inventory and update request progress.

### Locations

- Automatically created during disaster registration
- Reused through disaster_locations relationship

---

# Remaining Work

The core relief-request and distribution modules are implemented. Remaining work
is focused on permission coverage, transaction tests, delivery history, and
reporting improvements.

See the Completed Modules, Remaining Modules, Business Rules, and Roadmap sections in this file for the implementation order and pattern. Follow the same architecture and conventions used by existing modules.

---

# Core Database Tables

The schema contains:

- users
- locations
- disasters
- disaster_locations
- shelters
- warehouses
- items
- inventory
- shelter_inventory
- victims
- donations
- teams
- team_members
- relief_requests
- request_items
- distributions

The source of truth is:

- docs/DATABASE_SCHEMA.md
- DRMS_SCHEMA.sql

Never assume column names.

Always verify before writing queries.

---

# Architecture Rules

## General

- Keep frontend and backend separate.
- Do not rewrite working modules.
- Do not change API behavior unless requested.
- Do not modify authentication logic unless requested.
- Do not change database schema unless explicitly instructed.

---

## Backend Structure

Backend follows:

backend/src/

```text
routes/
controllers/
sqls/        # named SQL query-string constants imported by controllers
middleware/
utils/
server.js
db.js
```

### Routes

Responsible only for:

- Endpoint definitions
- Middleware wiring

Do NOT place business logic here.

---

### Controllers

Responsible only for:

- Receiving requests
- Validation
- Calling database operations
- Returning responses

Controllers must:

- Use async/await
- Handle errors correctly
- Return consistent JSON

Do NOT place large business logic here.

---

### Database Access

Use:

```js
const pool = require("../db");
```

Always:

- Use parameterized SQL
- Avoid string concatenation
- Validate inputs first

Example:

```js
await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
```

---

### Transactions

Use transactions when writing multiple tables.

Example cases:

- Team creation
- Donation + inventory update
- Distribution + stock update
- Relief request fulfillment

Pattern:

```js
const client = await pool.connect();

try {
  await client.query("BEGIN");

  ...

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  client.release();
}
```

---

# Authentication Rules

Protected routes must use:

```js
requireAuth;
```

Role-restricted routes must use:

```js
requireRole("admin");
requireRole("team");
requireRole("donor");
requireRole("volunteer");
```

Authenticated user information comes from:

```js
req.user;
```

Never trust client-supplied user IDs.

---

# API Rules

## Route Naming

Collection:

```text
GET    /api/resource
POST   /api/resource
```

Single Resource:

```text
GET    /api/resource/:id
PATCH  /api/resource/:id
DELETE /api/resource/:id
```

Actions:

```text
POST /api/teams/:id/approve
POST /api/teams/:id/reject
PATCH /api/disasters/:id/status
```

---

## Status Codes

Use:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

---

## Response Format

Success:

```json
{
  "message": "Success"
}
```

Resource:

```json
{
  "disasters": [...]
}
```

Error:

```json
{
  "message": "Error description"
}
```

Keep response shapes consistent.

---

# Frontend Rules

## API Access

Use:

```text
frontend/src/utils/api.js
```

Never scatter fetch() calls across pages.

Add reusable API functions there.

---

## Authentication

Use:

```text
frontend/src/utils/auth.js
```

for:

- token storage
- token retrieval
- logout

---

## Routing

Use:

```text
ProtectedRoute
```

for:

- admin pages
- team pages
- donor pages
- volunteer pages

---

## UI Design

Maintain existing:

- Dark theme
- Control-room aesthetic
- Amber accent color
- Responsive layouts

Do not redesign existing dashboards.

## Component and Style Reuse

Before creating a new page, inspect and reuse existing frontend components and
styles. Do not create a duplicate component or page-specific CSS when an
existing pattern already provides the required behavior.

Use these shared components where applicable:

- `frontend/src/components/DashboardShell.jsx` for authenticated dashboard layout, topbar, profile, and logout behavior.
- `frontend/src/components/ProtectedRoute.jsx` for role-protected routes.
- `frontend/src/components/DisasterList.jsx` for the shared disaster table and status controls.
- `frontend/src/components/Select.jsx` for animated, keyboard-accessible dropdowns.

Reuse the shared classes in `frontend/src/styles.css` before adding new CSS:

- Layout and content: `.dashboard-shell`, `.dashboard-content`, `.admin-layout`, `.admin-main`, `.module-section`, `.section-heading`, `.card-grid`, and `.team-grid`.
- Containers: `.info-card`, `.module-card`, `.empty-state`, `.error-banner`, and `.success-banner`.
- Forms and actions: `.field`, `.field-label`, `.form-grid`, `.button-row`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, and `.btn-link`.
- Data display: `.table-wrap`, `.data-table`, `.status-badge`, `.status-select`, `.role-pill`, `.count-badge`, `.member-list`, and `.member-chip`.
- Navigation and motion: `.tab-nav`, `.tab-btn`, `.tab-content`, and `.page-transition`.

When a new page needs a pattern that appears in more than one page, extract
that pattern into a shared component or shared CSS class instead of copying it.
Preserve the existing dark control-room visual language, spacing, responsive
behavior, and animations. Add a new class only when an existing class cannot
express the requirement without changing its established appearance.

---

# Role Permissions

The authoritative capability and endpoint-access matrix is maintained in this
file (Detailed Specification, Role Permissions section).

- ADMIN: disasters, team review/approval, donations, inventory, relief requests, and distribution assignment.
- TEAM: create and manage teams.
- VOLUNTEER: join and view teams.
- DONOR: submit donations and view personal donation history.

---

# Protected Files

Do NOT modify unless explicitly requested:

```text
backend/src/middleware/auth.js
frontend/src/utils/auth.js
```

Authentication is already working.

---

# Existing Frontend Pages

Current pages include:

- Login.jsx
- Register.jsx
- AdminDashboard.jsx
- TeamDashboard.jsx
- VolunteerDashboard.jsx

Reuse patterns from these pages when implementing new modules.

---

# Implementation Workflow

Before implementing a feature:

1. Read documentation.
2. Verify the feature does not already exist.
3. Identify involved tables.
4. Identify required roles.
5. Define API endpoints.
6. Implement backend.
7. Implement frontend API functions.
8. Implement UI.
9. Test permissions.
10. Update documentation.

---

# Feature Development Pattern

For every new module:

Backend:

```text
Route
→ Controller
→ PostgreSQL
→ JSON Response
```

Frontend:

```text
Page
→ api.js
→ Backend Route
→ Controller
→ PostgreSQL
→ Response
→ React State Update
```

Follow existing project patterns.

---

# Git Rules

One feature per commit.

Examples:

```text
feat: implement shelters module
feat: implement donations module
feat: implement warehouse management
fix: inventory quantity update
refactor: improve disaster controller
```

Commit small, focused changes.

---

# Detailed Specification

## Architecture and Request Flow

DRMS is a two-process application: `backend/` is a Node.js and Express REST
API, `frontend/` is a React 18 application served by Vite, and PostgreSQL is
the persistent data store. The root `npm run dev` script starts the backend on
port `5000` and frontend on port `5173` concurrently.

The request flow is:

1. A page calls an exported function from `frontend/src/utils/api.js`.
2. `request()` prefixes `/api`, uses the Vite proxy, serializes JSON, and adds the bearer token.
3. Express parses JSON and matches the mounted route.
4. Middleware authenticates the request and checks the role where required.
5. The controller validates input and runs parameterized SQL through `db.js`.
6. The frontend parses JSON, updates React state, or displays the error message.

Authentication flow:

1. Registration sends `POST /api/auth/register`.
2. The controller hashes the password with bcrypt and creates the user.
3. Login sends `POST /api/auth/login`.
4. The controller verifies the password and signs a JWT containing `user_id`, `full_name`, `email`, and `role`.
5. The frontend stores the token and user in `localStorage` as `drms_token` and `drms_user`.
6. Later requests send `Authorization: Bearer <jwt>`.
7. `requireAuth` verifies the token and `requireRole` enforces permissions.

## Current Routes

| Method             | Endpoint                | Purpose                                                 |
| ------------------ | ----------------------- | ------------------------------------------------------- |
| `POST`             | `/auth/register`        | Create an account                                       |
| `POST`             | `/auth/login`           | Authenticate an account                                 |
| `GET`              | `/auth/me`              | Load the authenticated profile                          |
| `GET`              | `/disasters`            | List disasters and locations                            |
| `POST`             | `/disasters`            | Admin creates a disaster                                |
| `PATCH`            | `/disasters/:id/status` | Admin updates disaster status                           |
| `GET`              | `/users/volunteers`     | List available volunteers                               |
| `POST`             | `/teams`                | Team user creates a team                                |
| `GET`              | `/teams`                | Admin lists all teams                                   |
| `GET`              | `/teams/mine`           | List the caller's teams                                 |
| `GET`              | `/teams/pending`        | Admin lists pending teams                               |
| `POST`             | `/teams/:id/approve`    | Admin approves a team; accepts an optional remark       |
| `POST`             | `/teams/:id/reject`     | Admin rejects a team; requires a remark                 |
| `DELETE`           | `/teams/:id/members/me` | Volunteer resigns from a team                           |
| `DELETE`           | `/teams/:id`            | Team leader disbands a team                             |
| `GET/POST`         | `/shelters`             | List shelters or admin creates one                      |
| `GET/PATCH/DELETE` | `/shelters/:id`         | View or admin-manage one shelter                        |
| `GET/POST`         | `/warehouses`           | List warehouses or admin creates one                    |
| `GET/PATCH/DELETE` | `/warehouses/:id`       | View or admin-manage one warehouse                      |
| `GET/POST`         | `/items`                | List items or admin creates one                         |
| `GET/PATCH/DELETE` | `/items/:id`            | View or admin-manage one item                           |
| `GET/POST`         | `/victims`              | List victims or admin registers one                     |
| `GET/PATCH/DELETE` | `/victims/:id`          | View or admin-manage one victim                         |
| `GET`              | `/inventory`            | List inventory                                          |
| `GET`              | `/inventory/:id`        | View one inventory record                               |
| `POST`             | `/inventory/adjust`     | Admin adds or removes stock                             |
| `DELETE`           | `/inventory/:id`        | Admin deletes an inventory record                       |
| `POST`             | `/donations`            | Donor creates a donation and adds stock transactionally |
| `GET`              | `/donations/mine`       | Donor lists their own donations                         |
| `GET`              | `/donations`            | Admin lists all donations                               |
| `GET`              | `/donations/:id`        | Authenticated user views an allowed donation            |

## Business Rules

### Disaster

- Only an authenticated admin can create a disaster.
- `title`, `division`, and `district` are required; `upazila` and `union` are optional.
- New disasters start as `ACTIVE`; the application supports `ACTIVE` and `CLOSED`.
- Any authenticated user may list disasters.

### Teams

- Only `team` users can register teams.
- Supported types are `medical`, `rescue`, `logistics`, `distribution`, and `general`.
- A team starts as `pending_approval`.
- The creator becomes the leader; selected users must be available volunteers.
- One person may belong to only one team.
- Admin approval stores `approved_by_admin_id` and an optional `review_remark`.
- Rejection requires a remark and releases all team members.
- Volunteers can resign; leaders must disband the team instead.

### Shelters and Warehouses

- Admins manage CRUD; authenticated users may list and view records.
- Both modules reuse or create locations transactionally.
- Shelter capacity must be a positive integer.

### Items

- Admins manage the item catalog; authenticated users may list and view items.
- Categories and units use the controlled values documented in `DATABASE_SCHEMA.md`.
- The backend validates values even when the frontend dropdown is bypassed.

### Victims

- Admins manage victim records.
- Each victim is linked to a disaster and may be assigned to a shelter.
- Victim statuses are `registered` and `relocated`.
- Shelter assignment locks the shelter row and prevents capacity overflow.
- Correlated subqueries and `CASE` return occupancy and shelter availability.

### Inventory

- Inventory connects one warehouse and one item with a unique pair.
- Admins use positive quantities with either Add stock or Remove stock.
- Both operations are transactional.
- Removal is rejected if it would make stock negative.

### Donations

- Only donors can create donations.
- A donation must reference an existing warehouse and one or more existing items.
- Each quantity must be a positive integer; a maximum of 20 items is accepted per request.
- Duplicate item IDs are merged before donation and inventory records are created.
- Donation records and inventory updates are committed together transactionally.
- Donors can list only their own donations; admins can list all donations.

## Role Permissions

| Capability                                                 | ADMIN | TEAM | VOLUNTEER | DONOR |
| ---------------------------------------------------------- | ----: | ---: | --------: | ----: |
| Access own dashboard                                       |   Yes |  Yes |       Yes |   Yes |
| View disasters                                             |   Yes |  Yes |       Yes |   Yes |
| Create or update disasters                                 |   Yes |   No |        No |    No |
| Create and manage teams                                    |    No |  Yes |        No |    No |
| Approve or reject teams                                    |   Yes |   No |        No |    No |
| View shelters, warehouses, items, victims, and inventory   |   Yes |  Yes |       Yes |   Yes |
| Manage shelters, warehouses, items, victims, and inventory |   Yes |   No |        No |    No |
| Create donations                                           |    No |   No |        No |   Yes |
| View own donation history                                  |    No |   No |        No |   Yes |
| View all donations                                         |   Yes |   No |        No |    No |
| Resign from a team                                         |    No |   No |       Yes |    No |

All future permissions must be enforced in backend middleware, not only by
hiding frontend controls.

## Roadmap, Dependencies, and Risks

### Completed

- Authentication, users, disasters, locations, teams, shelters, warehouses, items, victims, warehouse inventory, shelter inventory, donations, relief requests, and distributions.

### To Do

1. Add permission and transaction tests for relief requests, shelter inventory, and distributions.
2. Add delivery history and reporting improvements.

Dependencies and risks:

- Shelters must exist before victims and relief requests can be assigned.
- Warehouses and items must exist before inventory or donations.
- Warehouse and shelter inventory must be correct before distributions can transfer stock.
- Team approval should precede team assignment to a distribution.
- Remaining workflow status values require consistent validation.
- Donors contribute to warehouse inventory only. Relief requests are fulfilled from warehouse stock through approved team distributions.
- The `users.full_name` mismatch is resolved in authentication, user, and team SQL; migration `005_ensure_users_full_name.sql` handles legacy databases.

For every remaining module, implement the backend controller, route and
middleware, frontend API functions, role-appropriate UI, permission tests, and
transaction/error tests. Use one focused Git commit per feature.

# Final Rule

Do not invent schema.

Do not invent roles.

Do not invent API behavior.

Always use:

- DATABASE_SCHEMA.md
- AGENTS.md

as the source of truth.

When uncertain, inspect existing modules and follow established patterns.
