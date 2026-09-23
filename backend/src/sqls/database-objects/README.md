# Database Objects (Triggers, Functions, Procedures)

Inspectable SQL for the course evaluation, grouped in one place.
Each file mirrors an applied migration; migrations are the installers.

## 1. Trigger — inventoryAuditSqls.js

Every insert, update, archive, or delete on warehouse stock is written to an audit log so no stock movement goes untracked.

Live path: fires automatically on every inventory change. Migration: 014_inventory_audit_trigger.sql.

## 2. Function — shelterCapacitySqls.js

Returns free beds in a shelter (capacity minus active victims) as a single number the app can display and decide on.

Live path: called inside the shelter list and detail queries, shown in the victim-registration dropdown. Migration: 016_shelter_capacity_function.sql.

## 3. Procedure — dispatchUpdateProcedureSqls.js

Sets a request item's dispatched quantity and moves the request to partially fulfilled or fulfilled in one atomic step so the two tables can never disagree.

Live path: called when saving dispatched quantities in reliefRequestController.js. Migration: 018_set_dispatched_procedure.sql.

## 4. Function — requestAvailabilitySqls.js

Returns units of a request item still free for new assignments (requested minus dispatched minus quantities promised to teams in distributions that are neither delivered nor cancelled) as a single number.

Live path: called inside the request-detail item query and the distribution-assignment check, shown as the transfer cap in the admin distribution form. Migration: 019_request_availability_function.sql.

## 5. Trigger — requestItemValidationTriggerSqls.js

Rejects any insert or update that would push a request item's dispatched quantity above its requested quantity, even when the change bypasses the application. The lower bound (>= 0) is enforced by the request_items_quantity_dispatched_check constraint.

Live path: fires automatically on every request_items write. Migration: 020_request_item_validation_trigger.sql.

## 6. Trigger — requestStatusSyncTriggerSqls.js

Moves a relief request to fulfilled or partially_fulfilled automatically after any dispatched-quantity change, so the parent status can never disagree with its items.

Live path: fires automatically on every request_items dispatched update (deliveries, donations, manual saves). Migration: 021_request_status_sync_trigger.sql.

## 7. Function — requestSummarySqls.js

Returns one request's total requested, dispatched, and remaining units in a single call instead of repeated per-request aggregation.

Live path: called inside the relief-request list query for total_requested and total_remaining. Migration: 022_request_summary_function.sql.

## 8. Procedure — deliverDistributionProcedureSqls.js

Completes a picked-up or in-transit distribution atomically: moves every item into shelter stock, counts it as dispatched, and stamps the distribution delivered. The status-sync trigger advances the parent request.

Live path: called by updateDistributionStatus in distributionController.js; the controller keeps permission checks, transition validation, and HTTP responses. Migration: 023_deliver_distribution_procedure.sql.

## 9. Procedure — recordDonationProcedureSqls.js

Records a donor's warehouse donation atomically: validates the warehouse and every item, inserts the donation rows, adds the quantities to warehouse inventory, and returns the created donation ids so the caller can read back the exact rows.

Live path: called by createDonation in donationController.js; the controller keeps payload validation, donor authentication, and HTTP responses. Migration: 024_record_donation_procedure.sql.
