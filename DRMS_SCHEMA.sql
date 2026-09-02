CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  full_name VARCHAR (100) NOT NULL,
  email VARCHAR (120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  ROLE VARCHAR (30) NOT NULL,
  phone VARCHAR (20) UNIQUE
);
CREATE TABLE locations (
  location_id SERIAL PRIMARY KEY,
  division VARCHAR (50) NOT NULL,
  district VARCHAR (50) NOT NULL,
  upazila VARCHAR (50),
  union_name VARCHAR (50)
);
CREATE TABLE disasters (
  disaster_id SERIAL PRIMARY KEY,
  title VARCHAR (150) NOT NULL,
  status VARCHAR (30) CHECK (status IN ('ACTIVE', 'ONGOING', 'RESOLVED', 'CLOSED')),
  start_date DATE NOT NULL,
  created_by_admin_id INT NOT NULL REFERENCES users (user_id)
);
CREATE TABLE disaster_locations (
  disaster_id INT REFERENCES disasters (disaster_id) ON DELETE CASCADE,
  location_id INT REFERENCES locations (location_id) ON DELETE CASCADE,
  PRIMARY KEY (disaster_id, location_id)
);
CREATE TABLE shelters (
  shelter_id SERIAL PRIMARY KEY,
  name VARCHAR (100) NOT NULL,
  address TEXT,
  capacity INT NOT NULL CHECK (capacity > 0),
  admin_id INT REFERENCES users (user_id),
  location_id INT NOT NULL REFERENCES locations (location_id)
);
CREATE TABLE warehouses (
  warehouse_id SERIAL PRIMARY KEY,
  name VARCHAR (100) NOT NULL,
  admin_id INT REFERENCES users (user_id),
  location_id INT NOT NULL REFERENCES locations (location_id)
);
CREATE TABLE items (item_id SERIAL PRIMARY KEY, name VARCHAR (100) NOT NULL, category VARCHAR (50), unit VARCHAR (20) NOT NULL);
CREATE TABLE inventory (
  inventory_id SERIAL PRIMARY KEY,
  warehouse_id INT NOT NULL REFERENCES warehouses (warehouse_id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items (item_id),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  UNIQUE (warehouse_id, item_id)
);
CREATE TABLE victims (
  victim_id SERIAL PRIMARY KEY,
  full_name VARCHAR (100) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR (15),
  priority_level VARCHAR (20),
  status VARCHAR (20),
  shelter_id INT REFERENCES shelters (shelter_id)
);
CREATE TABLE donations (
  donation_id SERIAL PRIMARY KEY,
  donor_id INT NOT NULL REFERENCES users (user_id),
  warehouse_id INT NOT NULL REFERENCES warehouses (warehouse_id),
  item_id INT NOT NULL REFERENCES items (item_id),
  quantity INT NOT NULL CHECK (quantity > 0),
  donated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE teams (
  team_id SERIAL PRIMARY KEY,
  team_name VARCHAR (100) NOT NULL,
  team_type VARCHAR (50),
  status VARCHAR (20),
  leader_id INT REFERENCES users (user_id),
  approved_by_admin_id INT REFERENCES users (user_id)
);
CREATE TABLE team_members (
  team_member_id SERIAL PRIMARY KEY,
  team_id INT NOT NULL REFERENCES teams (team_id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  member_role VARCHAR (40),
  UNIQUE (team_id, user_id)
);
CREATE TABLE relief_requests (
  request_id SERIAL PRIMARY KEY,
  shelter_id INT NOT NULL REFERENCES shelters (shelter_id),
  requested_by_admin_id INT NOT NULL REFERENCES users (user_id),
  status VARCHAR (20),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE request_items (
  request_item_id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES relief_requests (request_id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items (item_id),
  quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
  quantity_dispatched INT NOT NULL DEFAULT 0 CHECK (quantity_dispatched >= 0)
);
CREATE TABLE distributions (
  distribution_id SERIAL PRIMARY KEY,
  request_id INT NOT NULL REFERENCES relief_requests (request_id),
  warehouse_id INT NOT NULL REFERENCES warehouses (warehouse_id),
  assigned_team_id INT NOT NULL REFERENCES teams (team_id),
  assigned_by_admin_id INT NOT NULL REFERENCES users (user_id),
  status VARCHAR (20),
  distributed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);