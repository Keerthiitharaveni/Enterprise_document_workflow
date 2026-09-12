import { getRequests } from "@/app/lib/api";
import RequestTable from "./RequestTable";
import { isRolesTurn, ROLES } from "@/app/lib/workflow";

export default async function ApproverQueue({ roleKey, basePath }) {
  const all = await getRequests({});
  const pendingForRole = (all || []).filter(
    (r) => r.status === "pending" && isRolesTurn(r, roleKey)
  );
  const decidedByRole = (all || []).filter(
    (r) => r.approval_steps?.some((s) => s.role === roleKey && s.decision !== "pending")
  );

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">
        {ROLES[roleKey].label} queue
      </h1>
      <p className="text-sm text-slate mb-8">
        Requests currently waiting on your decision.
      </p>

      <RequestTable
        requests={pendingForRole}
        basePath={basePath}
        emptyLabel="Nothing waiting on you right now."
      />

      <h2 className="font-serif text-lg text-ink mt-10 mb-3">History</h2>
      <RequestTable
        requests={decidedByRole}
        basePath={basePath}
        emptyLabel="No past decisions yet."
      />
    </div>
  );
}
