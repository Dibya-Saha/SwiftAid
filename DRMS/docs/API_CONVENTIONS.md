# API Conventions

## Base URL

The local API base URL is:

```text
http://localhost:5000/api
```

The frontend centralizes requests in `frontend/src/utils/api.js`.

## Route Naming

- Use plural resource nouns: `/disasters`, `/teams`, `/users`.
- Group routes under a resource mount such as `/api/disasters`.
- Use HTTP methods to describe operations: `GET` for reads, `POST` for creation or actions, and `PATCH` for partial updates.
- Use path parameters for resource identifiers: `/disasters/:id/status`.
- Use explicit action suffixes for team decisions: `/teams/:id/approve` and `/teams/:id/reject`.
- Keep authentication routes under `/api/auth`.

## Current Routes

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
| `GET` | `/teams/mine` | List the caller's teams |
| `GET` | `/teams/pending` | List teams awaiting review |
| `POST` | `/teams/:id/approve` | Approve a team |
| `POST` | `/teams/:id/reject` | Reject a team |
| `DELETE` | `/teams/:id/members/me` | Resign the caller from a team |
| `DELETE` | `/teams/:id` | Leader disbands their own team |

## Controller Responsibilities

Controllers own request validation, business rules, database calls, transaction boundaries, and response construction. Route files should remain focused on mapping paths to middleware and controller functions.

Controllers should read:

- JSON input from `req.body`.
- URL identifiers and actions from `req.params`.
- Authenticated identity and role from `req.user` after `requireAuth`.

## Database Access

- Import the shared pool from `backend/src/db.js`.
- Use parameterized placeholders such as `$1`, `$2`, and values arrays.
- Use a checked-out client and explicit `BEGIN`/`COMMIT`/`ROLLBACK` for related multi-table writes.
- Always release a checked-out client in `finally`.
- Never create a separate pool in a controller.

## Authentication Conventions

Protected requests use:

```http
Authorization: Bearer <jwt>
```

`requireAuth` verifies the token with `JWT_SECRET`, normalizes `req.user.role` to lowercase, and returns `401` when the token is missing, invalid, or expired. `requireRole('admin')` or another role guard returns `403` when the caller lacks permission.

## Response Format

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

## Error Handling

Validation errors return `400` with `{ "message": "..." }`. Missing or invalid authentication returns `401`; insufficient role permission returns `403`; missing resources return `404`; unique conflicts return `409`; unexpected database or server errors return `500` with a safe message. Controllers log internal errors server-side and should not expose credentials or SQL details to clients.

## Frontend Request Behavior

`api.js` sets `Content-Type: application/json`, adds the stored token, parses JSON, and throws `data.message` when `res.ok` is false. New frontend API functions should follow the same wrapper instead of calling `fetch()` directly from pages.
