# Feature Roadmap

## Completed

### Authentication

- Account registration with bcrypt password hashing
- Login with JWT tokens
- Eight-hour default token expiration
- Profile lookup through `/api/auth/me`
- Logout and protected frontend routes

### Users

- Role values for admin, donor, team, and volunteer users
- Volunteer availability endpoint
- Role-specific dashboard routing

### Disasters

- Admin disaster creation
- Disaster listing for authenticated users
- Disaster status updates
- Status values `ACTIVE`, `ONGOING`, `RESOLVED`, and `CLOSED`

### Locations

- Location creation during disaster creation
- Location reuse when geographic values match
- Disaster-to-location junction records
- Location data returned with disaster listings

### Teams

- Team creation by team-role users
- Supported team types
- Volunteer selection (free volunteers only)
- Automatic leader and member rows
- Pending approval state
- Admin approval and rejection
- Team membership listing
- Single-team membership enforcement
- Volunteer resignation
- Leader team disbanding

## Suggested Implementation Order

### 1. Shelters

Implement shelter CRUD, capacity validation, admin ownership, location selection, and shelter listing. Shelters are foundational for victims and relief requests.

### 2. Warehouses and Items

Implement warehouse management and the item catalog. Both are prerequisites for inventory and donations.

### 3. Inventory

Implement stock upsert and adjustment operations using the unique `(warehouse_id, item_id)` constraint. Add quantity validation and transaction boundaries.

### 4. Donations

Allow donors to submit item donations to a warehouse. Record the donation and update inventory in one transaction. Add donor history and admin visibility.

### 5. Relief Requests

Allow shelter-related administrators to create requests with `request_items`. Add request statuses, approval rules, and item quantity validation.

### 6. Distributions

Allow admins to assign approved requests to warehouses and approved teams. Update dispatched quantities and inventory transactionally, then expose team delivery workflows.

## Recommended Module Pattern

For each roadmap module, implement:

1. Backend controller with validation and parameterized SQL.
2. Backend route file mounted from `server.js`.
3. Authentication and role middleware on every protected route.
4. Frontend API functions in `frontend/src/utils/api.js`.
5. Role-appropriate page or dashboard components.
6. Transaction and error tests for important multi-table operations.

## Dependencies and Risks

- Shelters must exist before victims and relief requests can be assigned.
- Warehouses and items must exist before inventory or donations.
- Inventory must be correct before distributions can decrement stock.
- Team approval should precede team assignment to a distribution.
- Status values are currently unconstrained text for several future tables; application validation should be added consistently.
- The supplied schema uses `users.full_name`; current auth SQL references `users.name`. Resolve this application/schema mismatch before extending user-related features.
