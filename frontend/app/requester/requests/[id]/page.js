import Link from "next/link";
import { getRequest, getAuditLog } from "@/app/lib/api";
import StatusBadge from "@/app/components/StatusBadge";
import ApprovalStepper from "@/app/components/ApprovalStepper";

export const dynamic = "force-dynamic";

export default async function RequestDetail({ params }) {
  const request = await getRequest(params.id);
  const audit = await getAuditLog(params.id);

  if (!request) {
    return <p className="text-sm text-slate">Request not found.</p>;
  }

  return (
    <div>
      <Link href="/requester" className="text-xs text-slate hover:text-ink mb-6 inline-block">
        ← My requests
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-ink">{request.title}</h1>
          <p className="text-sm text-slate mt-1">{request.description}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="border border-line bg-paper rounded p-6 mb-6">
        <ApprovalStepper request={request} />
      </div>

      {request.amount != null && (
        <div className="border border-line bg-paper rounded p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate">Amount</p>
            <p className="text-ink font-medium">₹{Number(request.amount).toLocaleString("en-IN")}</p>
          </div>
          {request.vendor && (
            <div>
              <p className="text-slate">Vendor</p>
              <p className="text-ink font-medium">{request.vendor}</p>
            </div>
          )}
        </div>
      )}

      <div className="border border-line bg-paper rounded p-6">
        <p className="text-xs uppercase tracking-wide text-slate mb-3">Audit trail</p>
        {audit?.length ? (
          <ul className="space-y-2 text-sm">
            {audit.map((entry, i) => (
              <li key={i} className="text-ink/80">
                {entry.action || entry}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate">No activity recorded yet.</p>
        )}
      </div>
    </div>
  );
}
