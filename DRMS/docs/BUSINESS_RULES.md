# Business Rules

Status values and workflow behavior below distinguish what is implemented in the current application from what is only supported by the database design.

## Disaster Workflow

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

## Team Approval Workflow

**Implemented**

- Only users with role `team` can register a team.
- Supported team types are `medical`, `rescue`, `logistics`, `distribution`, and `general`.
- The creator becomes the leader and is inserted into `team_members` with role `leader`.
- Selected users must have role `volunteer` and cannot already belong to a team.
- One person may belong to only one team at a time. This is enforced in the `createTeam` transaction and by the `team_members_user_id_key` unique index.
- A team-role user who already belongs to a team (as leader or member) cannot create another team.
- New teams start as `pending_approval`.
- Only admins can view pending teams or approve/reject them.
- The reviewing admin is stored in `approved_by_admin_id`.
- A volunteer can resign from their team via `DELETE /api/teams/:id/members/me`; they become available and may join another team.
- Team leaders cannot resign or transfer ownership. They can only disband their team via `DELETE /api/teams/:id`, which releases all members.

**Future**

- Team reassignment and distribution status updates.

## Location Handling Workflow

**Implemented**

- Disaster creation searches for an existing matching location.
- Matching uses division, district, upazila, and union values, including null-safe comparisons.
- A missing location is inserted before the disaster is created.
- The disaster and location are linked through `disaster_locations`.
- Disaster creation is transactional; a failure rolls back all related inserts.

**Future**

- Independent location administration and validation against a geographic registry.

## Donation Workflow

**Implemented**

- The database can record a donor, warehouse, item, positive quantity, and timestamp.

**Future**

- Donor-facing donation form and `donations` API.
- Validation that the donor has role `donor`.
- Updating warehouse `inventory` after a donation.
- Donation review, cancellation, and audit history.

## Relief Request Workflow

**Implemented**

- The database models a shelter request, requesting admin, status, and timestamp.
- Requested items and dispatched quantities are modeled by `request_items`.

**Future**

- Shelter registration and request creation.
- Admin approval or rejection of requests.
- Item-level quantity validation and request status transitions.

## Distribution Workflow

**Implemented**

- The database links a request, warehouse, assigned team, assigning admin, status, and timestamp.

**Future**

- Admin assignment endpoint and team distribution dashboard.
- Inventory decrement when items are dispatched.
- Delivery completion, partial fulfillment, and delivery confirmation.

## Inventory Workflow

**Implemented**

- The database stores one inventory row per warehouse-item pair.
- Quantity defaults to zero and cannot be negative.
- The `(warehouse_id, item_id)` unique constraint prevents duplicate stock rows.

**Future**

- Warehouse and item management endpoints.
- Stock receipts from donations.
- Reservation and decrement logic for distributions.
- Low-stock and reconciliation reporting.
