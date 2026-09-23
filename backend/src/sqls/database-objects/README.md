# Database Objects (Triggers, Functions)

Inspectable SQL for the course evaluation, grouped in one place.
Each file mirrors an applied migration; migrations are the installers.

## 1. Trigger — inventoryAuditSqls.js

Every insert, update, archive, or delete on warehouse stock is written to an audit log so no stock movement goes untracked.

Live path: fires automatically on every inventory change. Migration: 014_inventory_audit_trigger.sql.

## 2. Function — shelterCapacitySqls.js

Returns free beds in a shelter (capacity minus active victims) as a single number the app can display and decide on.

Live path: called inside the shelter list and detail queries, shown in the victim-registration dropdown. Migration: 016_shelter_capacity_function.sql.
