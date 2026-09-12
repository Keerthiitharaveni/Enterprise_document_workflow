// Local preview data only — used when the backend can't be reached, so the
// role-based layouts can be reviewed before wiring the real API.

export const MOCK_USERS = [
  { id: 1, name: "Ananya Rao", role: "requester" },
  { id: 2, name: "Vikram Shah", role: "manager" },
  { id: 3, name: "Priya Menon", role: "finance" },
  { id: 4, name: "Rahul Verma", role: "procurement" },
  { id: 5, name: "Deepa Iyer", role: "admin" },
];

function steps(chainRoles, decidedThrough = -1) {
  return chainRoles.map((role, i) => ({
    role,
    approver_name: MOCK_USERS.find((u) => u.role === role)?.name,
    decision: i <= decidedThrough ? "approved" : i === decidedThrough + 1 ? "pending" : "pending",
    decided_at: i <= decidedThrough ? "2026-09-10T10:00:00Z" : null,
  }));
}

export const MOCK_REQUESTS = [
  {
    id: 101,
    title: "Annual leave — Diwali week",
    request_type: "leave",
    amount: null,
    status: "pending",
    created_by: 1,
    created_by_name: "Ananya Rao",
    created_at: "2026-09-08T09:00:00Z",
    approval_steps: steps(["manager"], -1),
  },
  {
    id: 102,
    title: "Laptops for new hires (x4)",
    request_type: "purchase",
    amount: 180000,
    vendor: "Dell Enterprise",
    status: "pending",
    created_by: 1,
    created_by_name: "Ananya Rao",
    created_at: "2026-09-05T09:00:00Z",
    approval_steps: steps(["manager", "finance", "procurement"], 0),
  },
  {
    id: 103,
    title: "New server rack — Hyderabad DC",
    request_type: "capex",
    amount: 950000,
    vendor: "HPE India",
    status: "pending",
    created_by: 1,
    created_by_name: "Ananya Rao",
    created_at: "2026-09-01T09:00:00Z",
    approval_steps: steps(["manager", "finance", "admin"], 1),
  },
  {
    id: 104,
    title: "Client visit — Bengaluru",
    request_type: "travel",
    amount: 32000,
    vendor: "MakeMyTrip Corporate",
    status: "approved",
    created_by: 1,
    created_by_name: "Ananya Rao",
    created_at: "2026-08-20T09:00:00Z",
    approval_steps: steps(["manager", "finance"], 1),
  },
  {
    id: 105,
    title: "Conference sponsorship — DevCon",
    request_type: "purchase",
    amount: 60000,
    vendor: "DevCon Events LLP",
    status: "rejected",
    created_by: 1,
    created_by_name: "Ananya Rao",
    created_at: "2026-08-15T09:00:00Z",
    approval_steps: [
      { role: "manager", approver_name: "Vikram Shah", decision: "rejected", decided_at: "2026-08-16T09:00:00Z" },
      { role: "finance", approver_name: "Priya Menon", decision: "pending", decided_at: null },
      { role: "procurement", approver_name: "Rahul Verma", decision: "pending", decided_at: null },
    ],
  },
];
