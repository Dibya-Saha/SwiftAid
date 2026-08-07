# DRMS Complete — Feature Summary

## What's been built

### ✅ Disaster Module (Admin-only)

- **Create disasters**: Register a new disaster with title, division, district, upazila, union
  - Automatically creates a location record and links it via `disaster_locations` junction
  - Only admins can create disasters
- **List disasters**: Any logged-in user can view all disasters with their linked locations
- **Update disaster status**: Admin can move disasters through ACTIVE → ONGOING → RESOLVED → CLOSED
  - Status dropdown on each disaster row
  - Real-time updates reflected in the list

**Backend endpoints:**

- `POST /api/disasters` — Admin only
- `GET /api/disasters` — Logged-in users
- `PATCH /api/disasters/:id/status` — Admin only

**Frontend:**

- AdminDashboard.jsx: Disaster form + list with status controls

**Database:**

- Inserts into `locations`, `disasters`, and `disaster_locations` (junction)
- Updates `disasters.status`

---

### ✅ Location Module (Auto-generated via Disasters)

- Locations are created on-the-fly when an admin registers a disaster
- Supports: division, district, upazila, union
- Automatically linked to disaster via `disaster_locations`
- If a location already exists, it can be reused for a second disaster in the same place

**Database:**

- `locations` table fully utilized
- `disaster_locations` junction table handles M:N relationship

---

### ✅ Team Module (Team-role users + Admin approval)

**For team-role users:**

- **Register a team**: Provide team name, select team type (medical/rescue/logistics/distribution/general)
- **Add volunteers**: Checkbox picker shows all available volunteers; select as many as needed
  - Team creator automatically becomes the leader
  - Volunteers are added to team_members as "member" role
  - Creator is added as "leader" role
- **View my teams**: List of all teams they lead or belong to
  - Shows leader name, member count, member roster
  - Status badge indicates pending_approval, approved, rejected, etc.

**For admins:**

- **Review pending teams**: List of all teams awaiting approval
  - Shows team name, type, leader, all members with their roles
  - Two action buttons: Approve & Reject
  - Approving/rejecting updates `teams.status` and records which admin reviewed it

**Backend endpoints:**

- `POST /api/teams` — Team-role only: create with volunteers
- `GET /api/teams/mine` — Logged-in users: my teams
- `GET /api/teams/pending` — Admin only: awaiting review
- `POST /api/teams/:id/approve` — Admin only
- `POST /api/teams/:id/reject` — Admin only

**Supporting endpoint:**

- `GET /api/users/volunteers` — Logged-in users: list all volunteers (used in the team creation form)

**Frontend:**

- TeamDashboard.jsx: Team form with volunteer checkbox picker + my teams list
- AdminDashboard.jsx: Pending teams section with approve/reject controls

**Database:**

- Inserts into `teams` and `team_members` (at least 2 rows: leader + members)
- Updates `teams.status` and `teams.approved_by_admin_id` on approval/rejection

---

### ✅ User/Auth Module (Existing, fully functional)

- Account registration with hashed passwords (bcrypt)
- Login with JWT (8-hour expiration)
- Role-based access: admin, donor, team, volunteer
- Profile fetch with token validation

---

## Role-based access

| Action                 | Admin | Team | Volunteer | Donor |
| ---------------------- | ----- | ---- | --------- | ----- |
| Register disaster      | ✅    | ✗    | ✗         | ✗     |
| View disasters         | ✅    | ✅   | ✅        | ✅    |
| Update disaster status | ✅    | ✗    | ✗         | ✗     |
| Register a team        | ✗     | ✅   | ✗         | ✗     |
| View my teams          | ✅    | ✅   | ✅        | ✅    |
| Review pending teams   | ✅    | ✗    | ✗         | ✗     |
| Approve/reject teams   | ✅    | ✗    | ✗         | ✗     |

---

## Quick start

1. **Extract** `DRMS-complete.zip`
2. **Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your DB credentials
   npm run dev
   ```
3. **Frontend** (in another terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. **Test flow:**
   - Register as **admin** → `/admin` → create a disaster
   - Register as **team** + **volunteer** (separate accounts) → `/team` → create team with volunteers
   - Go back to admin → review & approve the team
   - Both users can now see the team in their respective dashboards

---

## What's next (for future development)

The schema is already in place for:

- **Shelters** — Register, track occupancy, link to locations
- **Donations** — Log donations by donors, update warehouse inventory
- **Relief requests** — Shelters request items, admins approve and assign
- **Distributions** — Track what items go to which shelters via teams
- **Warehouse & Inventory** — Admin manages warehouses, track stock levels

All of these follow the same backend/frontend pattern already established.

---

## Tech stack

**Backend:**

- Node.js + Express
- PostgreSQL (pg client)
- bcrypt (password hashing)
- jsonwebtoken (JWT auth)
- dotenv (config)

**Frontend:**

- React 18 + Vite
- React Router 6 (navigation)
- Vanilla CSS (design tokens, no Tailwind/CSS-in-JS)

**Design:**

- Dark theme (control-room aesthetic)
- Accent color: amber (#f2b705)
- Mobile-responsive
- Keyboard accessible (focus outlines, semantic HTML)

---

## File count

- Backend: 4 controllers, 4 routes, 1 util, 1 db module, 1 server = **11 files**
- Frontend: 6 pages, 2 components, 2 utils, 1 stylesheet, 1 app root = **12 files**
- Config: package.json (backend + frontend + root), vite.config.js, .env.example, .gitignore, README = **5 files**

**Total: 28 files** (excluding node_modules and lock files)

---

**Ready to run.** No database migrations needed — your existing schema covers everything.
