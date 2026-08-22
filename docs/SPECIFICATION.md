# DRMS Specification

## Current Implementation Order

1. Shelters
2. Warehouses and items
3. Victims
4. Inventory
5. Donations
6. Relief requests
7. Distributions

## Module Pattern

Each module must follow:

```text
Route -> Controller -> named parameterized SQL -> PostgreSQL -> JSON response
Page -> api.js -> route -> controller -> React state -> shared UI
```

Protected routes use `requireAuth`; management routes use the appropriate
`requireRole` middleware. Multi-table writes use transactions.

## Shelter Module

Shelters are temporary accommodation facilities. Admins manage shelter CRUD;
authenticated users may list shelters. Locations are found or created in the
same transaction as shelter creation or update.

## Warehouse Module

Warehouses store relief supplies. Admins manage warehouse CRUD; authenticated
users may list warehouses. Warehouse locations use the shared `locations`
table and the same location resolution pattern as shelters.

## Victim Module

Victims should be implemented after warehouses and items. A victim belongs to a
disaster and may be assigned to a shelter. Capacity validation must prevent a
shelter from exceeding its configured capacity.

Required victim workflow:

1. Select an active disaster.
2. Enter victim details.
3. Optionally assign a shelter with available capacity.
4. List and update victim status and priority.

## SQL Guidance

Use joins for direct relationships and named parameterized queries. A
non-correlated query can resolve a reusable location. A correlated subquery is
appropriate for derived shelter occupancy, for example counting victims whose
`shelter_id` equals the outer shelter row. PostgreSQL functions should only be
introduced when the same transaction-safe calculation is reused by multiple
modules.
