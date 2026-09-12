# SmartFlow frontend — role-based layouts

Next.js (App Router, Tailwind, no TypeScript) implementing the 5-role,
4-request-type model you approved:

| Request type | Routing chain |
|---|---|
| Leave    | Requester → Manager |
| Purchase | Requester → Manager → Finance → Procurement |
| CapEx    | Requester → Manager → Finance → Admin |
| Travel   | Requester → Manager → Finance |

The chain lives in one place: `app/lib/workflow.js`. Everything else (the
stepper, the queue filters, the "is it your turn" logic) reads from there —
if the backend's routing table ever changes, this is the only file to edit
on the frontend.

## Folder structure

```
app/
  page.js                 → role-select / profile switcher (demo login stand-in)
  requester/               → Requester's own layout + nav
    layout.js, page.js (My Requests), new/page.js (submit), requests/[id]/page.js (track, read-only)
  manager/                 → Manager's own layout + nav
  finance/                 → Finance's own layout + nav
  procurement/              → Procurement's own layout + nav
  admin/                   → Admin's own layout + nav (All Requests, Users, Audit Log)
  components/              → shared building blocks (Sidebar/shell, stepper, tables, decision panel)
  lib/
    workflow.js             → routing chains + role metadata (the source of truth)
    api.js                  → calls your FastAPI backend, one function per endpoint
    mockData.js             → local preview data, used ONLY if the backend isn't reachable
```

Each role gets its **own `layout.js`** (separate sidebar, nav items, accent
color) as you asked — Manager/Finance/Procurement share the same queue and
detail *components* (`ApproverQueue`, `ApproverDetail`) since their jobs are
structurally identical (see if it's their turn, approve/reject, view
history); only the routing role differs. This means one bug fix updates all
three instead of three copies drifting apart.

## Honest scope notes — read before demoing

- **`app/page.js` is a role switcher, not real auth.** There's no login,
  session, or JWT here. Clicking a role card just navigates to that role's
  routes. Wire real auth before this goes anywhere near production; for a
  4-day capstone demo this is normal and fine to say out loud.
- **`mockData.js` only fires when the backend is unreachable** (`api.js`
  catches the failed fetch and falls back). Once your backend's `/requests`
  endpoint returns `request_type`, `created_by`, and `approval_steps` with a
  `role` field per step, everything here works against real data with zero
  changes to the pages.
- **Backend contract this frontend expects**, per your extended (additive)
  backend:
  - `GET /requests` → array of requests, each with `request_type`,
    `created_by`, `created_by_name`, `amount`, `vendor`, `status`,
    `created_at`, and `approval_steps: [{ role, approver_name, decision, decided_at }]`
  - `GET /users?role=` → array of `{ id, name, role }`
  - Everything else matches Day 2 of the guide (`decide`, `analyze`, `audit`)
    unchanged.
- **"My Requests" needed no backend change** — it's a client-side filter on
  `created_by`, exactly as flagged earlier.
- Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` if your backend isn't on
  `http://localhost:8000`.

## Run it

```
cd frontend
npm install
npm run dev
```

Visit `localhost:3000`, pick a role card, and you're in that role's desk.
