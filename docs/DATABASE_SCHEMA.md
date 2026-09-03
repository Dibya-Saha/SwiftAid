# Database Schema

The schema below is based on the supplied PostgreSQL table-creation SQL. `SERIAL` columns are PostgreSQL auto-incrementing integer columns backed by sequences.

## `users`

**Purpose:** Stores accounts, credentials, contact information, and role assignments.

| Column | Type | Constraints |
|---|---|---|
| `user_id` | `SERIAL` / integer | Primary key |
| `full_name` | `VARCHAR(100)` | Required |
| `email` | `VARCHAR(120)` | Required, unique |
| `password_hash` | `TEXT` | Required |
| `role` | `VARCHAR(30)` | Required |
| `phone` | `VARCHAR(20)` | Nullable, unique |

**Relationships:** Parent of admin, donor, team leader, team member, shelter admin, warehouse admin, relief-request admin, and distribution-assignment references.

**Example usage:** Login locates a user by email; a JWT identifies the user for protected operations.

## `locations`

**Purpose:** Stores geographic subdivisions reused by disasters, shelters, and warehouses.

| Column | Type | Constraints |
|---|---|---|
| `location_id` | `SERIAL` / integer | Primary key |
| `division` | `VARCHAR(50)` | Required |
| `district` | `VARCHAR(50)` | Required |
| `upazila` | `VARCHAR(50)` | Nullable |
| `union_name` | `VARCHAR(50)` | Nullable |

**Relationships:** Referenced by `disaster_locations`, `shelters`, and `warehouses`.

**Example usage:** A disaster can reuse an existing location with the same geographic values.

## `disasters`

**Purpose:** Records incidents managed by administrators.

| Column | Type | Constraints |
|---|---|---|
| `disaster_id` | `SERIAL` / integer | Primary key |
| `title` | `VARCHAR(150)` | Required |
| `status` | `VARCHAR(30)` | Allowed by application: `ACTIVE`, `CLOSED` |
| `start_date` | `DATE` | Required |
| `created_by_admin_id` | `INT` | Foreign key to `users.user_id`, required |

**Relationships:** Belongs to the creating admin and connects to locations through `disaster_locations`.

**Example usage:** The admin creates an incident as `ACTIVE` and may update its lifecycle status.

## `disaster_locations`

**Purpose:** Junction table connecting disasters to one or more locations.

| Column | Type | Constraints |
|---|---|---|
| `disaster_id` | `INT` | Foreign key to `disasters.disaster_id`, cascade delete |
| `location_id` | `INT` | Foreign key to `locations.location_id`, cascade delete |

**Primary key:** Composite key (`disaster_id`, `location_id`).

**Relationships:** Implements the many-to-many relationship between disasters and locations.

**Example usage:** One location may be linked to multiple disasters without duplicating the location record.

## `shelters`

**Purpose:** Stores emergency shelters and their capacity.

| Column | Type | Constraints |
|---|---|---|
| `shelter_id` | `SERIAL` / integer | Primary key |
| `name` | `VARCHAR(100)` | Required |
| `address` | `TEXT` | Nullable |
| `capacity` | `INT` | Required, greater than zero |
| `admin_id` | `INT` | Nullable foreign key to `users.user_id` |
| `location_id` | `INT` | Required foreign key to `locations.location_id` |

**Relationships:** Belongs to a location and optionally an administering user; referenced by `victims` and `relief_requests`.

**Example usage:** A future shelter module registers a shelter at a known location and tracks its capacity.

## `warehouses`

**Purpose:** Stores relief supply warehouses.

| Column | Type | Constraints |
|---|---|---|
| `warehouse_id` | `SERIAL` / integer | Primary key |
| `name` | `VARCHAR(100)` | Required |
| `admin_id` | `INT` | Nullable foreign key to `users.user_id` |
| `location_id` | `INT` | Required foreign key to `locations.location_id` |

**Relationships:** Belongs to a location and optionally an admin; referenced by `inventory`, `donations`, and `distributions`.

**Example usage:** An admin manages stock at a warehouse associated with a geographic location.

## `items`

**Purpose:** Catalogs relief item types and measurement units.

| Column | Type | Constraints |
|---|---|---|
| `item_id` | `SERIAL` / integer | Primary key |
| `name` | `VARCHAR(100)` | Required |
| `category` | `VARCHAR(50)` | Required; controlled application values |
| `unit` | `VARCHAR(20)` | Required; controlled application values |

**Relationships:** Referenced by `inventory`, `donations`, and `request_items`.

**Example usage:** An item can be defined as rice measured in kilograms.

Categories are `food`, `water`, `medical`, `hygiene`, `clothing`, `shelter`,
`rescue`, `logistics`, and `other`. Units are `kg`, `g`, `litre`, `ml`,
`piece`, `pack`, `box`, `bag`, `bottle`, `can`, `set`, `pair`, and `tablet`.

## `inventory`

**Purpose:** Tracks the quantity of each item held by each warehouse.

| Column | Type | Constraints |
|---|---|---|
| `inventory_id` | `SERIAL` / integer | Primary key |
| `warehouse_id` | `INT` | Required foreign key to `warehouses.warehouse_id`, cascade delete |
| `item_id` | `INT` | Required foreign key to `items.item_id` |
| `quantity` | `INT` | Required, default `0`, non-negative |

**Unique constraint:** (`warehouse_id`, `item_id`).

**Relationships:** Resolves the many-to-many relationship between warehouses and items with quantity.

**Example usage:** A warehouse has one inventory row for each stocked item.

Admins use positive Add stock and Remove stock operations. Removal cannot make
quantity negative.

## `shelter_inventory`

**Purpose:** Tracks supplies currently held by each shelter independently from
warehouse stock.

| Column | Type | Constraints |
|---|---|---|
| `shelter_inventory_id` | `SERIAL` / integer | Primary key |
| `shelter_id` | `INT` | Required foreign key to `shelters.shelter_id`, cascade delete |
| `item_id` | `INT` | Required foreign key to `items.item_id` |
| `quantity` | `INT` | Required, default `0`, non-negative |
| `minimum_quantity` | `INT` | Required, default `0`, non-negative low-stock threshold |
| `updated_at` | `TIMESTAMP` | Last stock update time |

**Unique constraint:** (`shelter_id`, `item_id`).

**Example usage:** Warehouse distributions increase shelter stock; approved
administrative adjustments record consumption or corrections.

## `victims`

**Purpose:** Stores people affected by disasters and optionally assigned to shelters.

| Column | Type | Constraints |
|---|---|---|
| `victim_id` | `SERIAL` / integer | Primary key |
| `full_name` | `VARCHAR(100)` | Required |
| `date_of_birth` | `DATE` | Nullable |
| `gender` | `VARCHAR(15)` | Nullable |
| `priority_level` | `VARCHAR(20)` | Nullable |
| `status` | `VARCHAR(20)` | Allowed by application: `registered`, `relocated` |
| `disaster_id` | `INT` | Nullable foreign key to `disasters.disaster_id`; required by victim API |
| `shelter_id` | `INT` | Nullable foreign key to `shelters.shelter_id` |

**Relationships:** Belongs to one disaster and may belong to one shelter.

**Example usage:** A future registration workflow records a victim and assigns them to an available shelter.

## `donations`

**Purpose:** Records item donations from donors into warehouses.

| Column | Type | Constraints |
|---|---|---|
| `donation_id` | `SERIAL` / integer | Primary key |
| `donor_id` | `INT` | Required foreign key to `users.user_id` |
| `warehouse_id` | `INT` | Required foreign key to `warehouses.warehouse_id` |
| `item_id` | `INT` | Required foreign key to `items.item_id` |
| `quantity` | `INT` | Required, greater than zero |
| `donated_at` | `TIMESTAMP` | Defaults to `CURRENT_TIMESTAMP` |

**Relationships:** A user donates an item quantity to a warehouse.

**Example usage:** A donor records 100 units of an item for a selected warehouse.

## `teams`

**Purpose:** Stores response teams and their approval state.

| Column | Type | Constraints |
|---|---|---|
| `team_id` | `SERIAL` / integer | Primary key |
| `team_name` | `VARCHAR(100)` | Required |
| `team_type` | `VARCHAR(50)` | Nullable |
| `status` | `VARCHAR(20)` | Nullable |
| `leader_id` | `INT` | Nullable foreign key to `users.user_id` |
| `approved_by_admin_id` | `INT` | Nullable foreign key to `users.user_id` |
| `review_remark` | `TEXT` | Nullable administrator review explanation |

**Relationships:** Has many `team_members`; optionally belongs to a leader and reviewing admin; referenced by `distributions`.

**Example usage:** A team-role user creates a team in `pending_approval`; an admin changes it to `approved` or `rejected`.

## `team_members`

**Purpose:** Associates users with teams and records their team role.

| Column | Type | Constraints |
|---|---|---|
| `team_member_id` | `SERIAL` / integer | Primary key |
| `team_id` | `INT` | Required foreign key to `teams.team_id`, cascade delete |
| `user_id` | `INT` | Required foreign key to `users.user_id`, cascade delete |
| `member_role` | `VARCHAR(40)` | Nullable |

**Unique constraint:** (`team_id`, `user_id`). The `team_members_user_id_key` unique index on `user_id` (added by `backend/migrations/001_single_team_membership.sql`) enforces that one user can belong to at most one team.

**Relationships:** Resolves the many-to-many relationship between users and teams.

**Example usage:** A team leader has a `leader` row and selected volunteers have `member` rows. A volunteer resigns by deleting their `member` row; a leader disbands the team, which cascades to all membership rows.

## `relief_requests`

**Purpose:** Records supply requests submitted for shelters.

| Column | Type | Constraints |
|---|---|---|
| `request_id` | `SERIAL` / integer | Primary key |
| `shelter_id` | `INT` | Required foreign key to `shelters.shelter_id` |
| `requested_by_admin_id` | `INT` | Required foreign key to `users.user_id` |
| `status` | `VARCHAR(20)` | Nullable |
| `requested_at` | `TIMESTAMP` | Defaults to `CURRENT_TIMESTAMP` |

**Relationships:** Belongs to a shelter and requesting admin; has many `request_items`; referenced by `distributions`.

**Example usage:** An admin creates a pending request for food and medicine for a shelter.

## `request_items`

**Purpose:** Lists requested items and dispatch progress for a relief request.

| Column | Type | Constraints |
|---|---|---|
| `request_item_id` | `SERIAL` / integer | Primary key |
| `request_id` | `INT` | Required foreign key to `relief_requests.request_id`, cascade delete |
| `item_id` | `INT` | Required foreign key to `items.item_id` |
| `quantity_requested` | `INT` | Required, greater than zero |
| `quantity_dispatched` | `INT` | Required, default `0`, non-negative |

**Relationships:** Belongs to one relief request and one item.

**Example usage:** A request may contain 500 requested units, of which 200 have been dispatched.

## `distributions`

**Purpose:** Assigns relief delivery work to a team from a warehouse for a request.

| Column | Type | Constraints |
|---|---|---|
| `distribution_id` | `SERIAL` / integer | Primary key |
| `request_id` | `INT` | Required foreign key to `relief_requests.request_id` |
| `warehouse_id` | `INT` | Required foreign key to `warehouses.warehouse_id` |
| `assigned_team_id` | `INT` | Required foreign key to `teams.team_id` |
| `assigned_by_admin_id` | `INT` | Required foreign key to `users.user_id` |
| `status` | `VARCHAR(20)` | Nullable |
| `distributed_at` | `TIMESTAMP` | Defaults to `CURRENT_TIMESTAMP` |

**Relationships:** Connects a relief request, warehouse, response team, and assigning admin.

**Example usage:** An admin assigns an approved request to a team for dispatch from a warehouse.

## Relationship Summary

- `users` creates disasters through `disasters.created_by_admin_id`.
- `disasters` and `locations` have a many-to-many relationship through `disaster_locations`.
- `locations` has many `shelters` and `warehouses`.
- `warehouses` and `items` have a many-to-many relationship through `inventory`.
- `users` and `teams` have a many-to-many relationship through `team_members`.
- `shelters` have many `victims` and `relief_requests`.
- `users`, `warehouses`, and `items` combine in `donations`.
- `relief_requests` have many `request_items` and `distributions`.
- `distributions` connect relief requests, warehouses, teams, and admins.

## Referential Actions

- Deleting a disaster cascades to its `disaster_locations` rows.
- Deleting a location cascades to its `disaster_locations` rows.
- Deleting a warehouse cascades to its `inventory` rows.
- Deleting a team cascades to its `team_members` rows.
- Deleting a user cascades to their `team_members` rows.
- Deleting a relief request cascades to its `request_items` rows.

## Application Rules and Migrations

- Disaster status is restricted by the application to `ACTIVE` and `CLOSED`.
- Victim status is restricted by the application and migration to `registered`
  and `relocated`.
- Item categories are `food`, `water`, `medical`, `hygiene`, `clothing`,
  `shelter`, `rescue`, `logistics`, and `other`.
- Item units are `kg`, `g`, `litre`, `ml`, `piece`, `pack`, `box`, `bag`,
  `bottle`, `can`, `set`, `pair`, and `tablet`.
- Inventory uses one unique row per `(warehouse_id, item_id)` and cannot have
  a negative quantity.
- Donors contribute to warehouse `inventory` only. Shelter stock is stored
  separately in `shelter_inventory` and is updated through deliveries or
  approved administrative adjustments.
- Team review explanations are stored in `teams.review_remark`.

Run migrations in numeric order after the base schema:

1. `001_single_team_membership.sql`
2. `002_team_review_remark.sql`
3. `003_victim_disaster_relationship.sql`
4. `004_victim_status_values.sql`
5. `005_ensure_users_full_name.sql`
6. `006_shelter_inventory_and_relief_donation.sql` — creates independent shelter inventory
7. `007_shelter_inventory_movements.sql` — adds low-stock thresholds and adjustment history
8. `008_distributions.sql` — adds item-level warehouse-to-shelter distribution records
