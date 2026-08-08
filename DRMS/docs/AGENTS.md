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
3. docs/SPECIFICATION.md
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

### Locations

- Automatically created during disaster registration
- Reused through disaster_locations relationship

---

# Future Modules

The following database modules already exist in the schema but are not fully implemented: shelters, warehouses, items, inventory, victims, donations, relief_requests, request_items, and distributions.

See [SPECIFICATION.md](SPECIFICATION.md) (Feature Roadmap section) for the suggested implementation order and pattern. Follow the same architecture and conventions used by existing modules.

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
await pool.query(
  "SELECT * FROM users WHERE user_id = $1",
  [userId]
);
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
requireAuth
```

Role-restricted routes must use:

```js
requireRole("admin")
requireRole("team")
requireRole("donor")
requireRole("volunteer")
```

Authenticated user information comes from:

```js
req.user
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

---

# Role Permissions

The authoritative capability and endpoint-access matrix is maintained in [SPECIFICATION.md](SPECIFICATION.md) (Role Permissions section).

- ADMIN: disasters, team review/approval, and future operational management.
- TEAM: create and manage teams.
- VOLUNTEER: join and view teams.
- DONOR: future donation workflows.

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

# Final Rule

Do not invent schema.

Do not invent roles.

Do not invent API behavior.

Always use:

- DATABASE_SCHEMA.md
- SPECIFICATION.md

as the source of truth.

When uncertain, inspect existing modules and follow established patterns.