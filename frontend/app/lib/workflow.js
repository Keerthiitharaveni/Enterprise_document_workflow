// SmartFlow — routing rules
//
// This is the one file that encodes "which role approves which request type,
// and in what order." If Deloitte asks "what happens to a CapEx request",
// the answer lives here, not scattered across pages.
//
// NOTE: the backend is the source of truth once request_type + department
// routing exist server-side. This config lets the frontend render the right
// stepper/labels immediately, and should be kept identical to the backend's
// routing table so the UI never claims a step that the API can't produce.

export const ROLES = {
  requester: { key: "requester", label: "Requester", accent: "pine" },
  manager: { key: "manager", label: "Manager", accent: "steel" },
  finance: { key: "finance", label: "Finance", accent: "amber" },
  procurement: { key: "procurement", label: "Procurement", accent: "plum" },
  admin: { key: "admin", label: "Admin", accent: "brick" },
};

// request_type -> ordered list of approver roles (Requester is the
// originator, never an approval step, so it's excluded here)
export const ROUTING_CHAINS = {
  leave: {
    label: "Leave Request",
    description: "Time-off request. Single approval — your manager signs off.",
    chain: ["manager"],
  },
  purchase: {
    label: "Purchase Request",
    description:
      "Goods or services purchase. Routes through your manager, then Finance for budget check, then Procurement to place the order.",
    chain: ["manager", "finance", "procurement"],
  },
  capex: {
    label: "CapEx Request",
    description:
      "Capital expenditure (equipment, infrastructure, long-term assets). Routes through your manager, Finance, then Admin for final sign-off.",
    chain: ["manager", "finance", "admin"],
  },
  travel: {
    label: "Travel Request",
    description:
      "Business travel booking. Routes through your manager, then Finance for cost approval.",
    chain: ["manager", "finance"],
  },
};

export function getChainForType(requestType) {
  return ROUTING_CHAINS[requestType]?.chain ?? [];
}

// Given a request (with request_type + approval_steps[{role, decision}])
// and a role, is that role the current pending approver for this request?
export function isRolesTurn(request, role) {
  if (!request?.approval_steps?.length) return false;
  const chain = getChainForType(request.request_type);
  const firstPendingIndex = request.approval_steps.findIndex(
    (s) => s.decision === "pending"
  );
  if (firstPendingIndex === -1) return false;
  return chain[firstPendingIndex] === role;
}

export function stepStatusList(request) {
  const chain = getChainForType(request.request_type);
  return chain.map((role, i) => ({
    role,
    label: ROLES[role]?.label ?? role,
    status: request.approval_steps?.[i]?.decision ?? "pending",
    approverName: request.approval_steps?.[i]?.approver_name ?? null,
    decidedAt: request.approval_steps?.[i]?.decided_at ?? null,
  }));
}
