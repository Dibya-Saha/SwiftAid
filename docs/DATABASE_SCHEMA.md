# Database Schema Notes

This file records the application relationships used by the current modules.
The deployed PostgreSQL DDL remains the source of truth.

## Core Relationships

- `locations` is reused by `disasters`, `shelters`, and `warehouses`.
- `shelters.location_id` references `locations.location_id`.
- `warehouses.location_id` references `locations.location_id`.
- `victims.shelter_id` references `shelters.shelter_id`.
- `victims.disaster_id` references `disasters.disaster_id`.
- `inventory` connects warehouses and items through `(warehouse_id, item_id)`.

## Victims

The migration `003_victim_disaster_relationship.sql` adds:

```sql
disaster_id INTEGER REFERENCES disasters(disaster_id)
```

This allows each victim record to be associated with both the disaster and the
shelter where they are accommodated. The column is initially nullable so
existing victim records can be migrated safely before a production deployment
requires it.

## Current Tables

`users`, `locations`, `disasters`, `disaster_locations`, `shelters`,
`warehouses`, `items`, `inventory`, `victims`, `donations`, `teams`,
`team_members`, `relief_requests`, `request_items`, and `distributions`.
