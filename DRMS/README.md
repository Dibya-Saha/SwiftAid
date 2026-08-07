# DRMS —  backend + (login) frontend

Two folders:

- `backend/` — Express API, connects to your local Postgres, handles
  register/login with hashed passwords + JWT.
- `frontend/` — React (Vite) app: a login page, a register page, and four
  minimal placeholder dashboards (admin / donor / team / volunteer).

Your `users` table (the one you already created) is used as-is — nothing
in this backend alters your schema.

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and put in your real local Postgres password (same
credentials you used for the `DRMS_local` connection in Navicat:
host `localhost`, port `5432`, database `postgres`, user `postgres`).
Also change `JWT_SECRET` to any random string.

Run it:

```bash
npm run dev
```

You should see:

```
[db] connected to Postgres
[server] DRMS API running on http://localhost:5000
```

Sanity check in your browser or curl: `http://localhost:5000/api/health`
should return `{"status":"ok","db":"connected"}`. If `db` says
`unreachable`, double check the `.env` values against Navicat.

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. You'll land on the login page.

## 3. Try the full flow

1. Click "Register here", fill in the form, pick a role, submit.
   - This sends a `POST /api/auth/register` to the backend, which hashes
     the password with bcrypt and inserts a row into your `users` table.
   - Open the `users` table in Navicat afterward — you'll see the new row
     (password stored as a bcrypt hash, never plain text).
2. You're redirected to `/login`. Sign in with the same email/password.
   - This sends `POST /api/auth/login`, which verifies the password and
     returns a JWT. The frontend stores it in `localStorage`.
3. You land on the dashboard matching the role you registered with
   (`/admin`, `/donor`, `/team`, or `/volunteer`). The dashboard calls
   `GET /api/auth/me` with the token to pull your profile straight back
   out of Postgres, confirming the round trip works end to end.
4. "Log out" clears the token and sends you back to `/login`. Try opening
   `/admin` directly while logged out, or while logged in as a donor —
   you'll get redirected instead of seeing the page.

## TO_DO

This is intentionally minimal so anyone can grow it. 

- Add routes/controllers for `disasters`, `shelters`, `warehouses`,
  `items`, `inventory` — same pattern as `authController.js`
  (query via the shared `pool` in `db.js`, protect with `requireAuth`
  and, where needed, `requireRole('admin')`).
- Give the Admin dashboard a real disaster/shelter list.
- Give the Donor dashboard a "log a donation" form that posts to a new
  `/api/donations` route.
- Give the Team dashboard the list of `distributions` assigned to that
  team, and let them update `status`.
- Give the Volunteer dashboard their `team_members` row(s).

Each of those is the same shape as what's already here: a route, a
controller function with a parameterized SQL query, and a React page
that calls it through `src/api.js`.
