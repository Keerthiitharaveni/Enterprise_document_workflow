// Role labels and request-type copy shared by the role-specific interfaces.

export const ROLES = {
  requester: { key: "requester", label: "Requester", accent: "pine" },
  manager: { key: "manager", label: "Manager", accent: "steel" },
  finance: { key: "finance", label: "Finance", accent: "amber" },
  procurement: { key: "procurement", label: "Procurement", accent: "plum" },
  admin: { key: "admin", label: "Admin", accent: "brick" },
};

export const ROUTING_CHAINS = {
  leave: { label: "Leave Request", description: "Manager approval for requests below the approval threshold.", chain: ["manager"] },
  purchase: { label: "Purchase Request", description: "Manager first; high-value purchases then require Procurement.", chain: ["manager", "procurement"] },
  capex: { label: "CapEx Request", description: "Manager first; high-value capital expenditure then requires Finance.", chain: ["manager", "finance"] },
  travel: { label: "Travel Request", description: "Manager first; high-value travel then requires Finance.", chain: ["manager", "finance"] },
};

export function getChainForType(requestType) {
  return ROUTING_CHAINS[requestType]?.chain ?? [];
}

// The backend supplies the current stage. The UI never infers authority from
// a request type or a client-side approver ID.
export function isRolesTurn(request, role) {
  return request?.status === "pending" && request?.current_approver_role === role;
}

export function stepStatusList(request) {
  return (request?.approval_steps || []).map((step) => ({
    id: step.id,
    role: step.approver_application_role || "approver",
    label: ROLES[step.approver_application_role]?.label || "Approver",
    status: step.decision,
    approverName: step.approver_name,
    decidedAt: step.decided_at,
    notes: step.decision_notes,
    isCurrent: step.is_current,
    order: step.step_order,
  }));
}
