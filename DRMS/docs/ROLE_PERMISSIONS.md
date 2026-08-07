# Role Permissions

The database stores role values as text. The current application uses lowercase values: `admin`, `team`, `volunteer`, and `donor`. This document uses uppercase labels for readability.

## Current Permissions

| Capability | ADMIN | TEAM | VOLUNTEER | DONOR |
|---|---:|---:|---:|---:|
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
| View available volunteers API | Yes | Yes | Yes | Yes |

## Current Endpoint Access

| Endpoint | Required access |
|---|---|
| `POST /api/auth/register` | Public |
| `POST /api/auth/login` | Public |
| `GET /api/auth/me` | Valid bearer token |
| `GET /api/disasters` | Any authenticated user |
| `POST /api/disasters` | Authenticated `admin` |
| `PATCH /api/disasters/:id/status` | Authenticated `admin` |
| `POST /api/teams` | Authenticated `team` |
| `GET /api/teams/mine` | Any authenticated user |
| `GET /api/teams/pending` | Authenticated `admin` |
| `POST /api/teams/:id/approve` | Authenticated `admin` |
| `POST /api/teams/:id/reject` | Authenticated `admin` |
| `GET /api/users/volunteers` | Any authenticated user |

## Dashboard Access

- `ADMIN`: `/admin`, protected by `ProtectedRoute role="admin"`.
- `TEAM`: `/team`, protected by `ProtectedRoute role="team"`.
- `VOLUNTEER`: `/volunteer`, protected by `ProtectedRoute role="volunteer"`.
- `DONOR`: `/donor`, protected by `ProtectedRoute role="donor"`.

Unauthenticated users are redirected to `/login`. Authenticated users attempting another role's dashboard are redirected to their own role home.

## Future Permissions

- `ADMIN`: manage shelters, warehouses, items, inventory, victims, requests, distributions, and workflow approvals.
- `TEAM`: view assigned distributions and update permitted delivery status fields.
- `VOLUNTEER`: view team assignments and operational tasks assigned through approved teams.
- `DONOR`: create and view their own donations and donation status.
- All future permissions must be enforced in backend middleware, not only by hiding frontend controls.
