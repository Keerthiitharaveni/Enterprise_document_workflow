import { getRequests, getAuditLog } from "@/app/lib/api";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const all = await getRequests({});
  const withAudit = await Promise.all(
    (all || []).map(async (r) => ({
      request: r,
      audit: await getAuditLog(r.id),
    }))
  );

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">Audit log</h1>
      <p className="text-sm text-slate mb-8">
        Every recorded action, grouped by request.
      </p>

      <div className="space-y-4">
        {withAudit.map(({ request, audit }) => (
          <div key={request.id} className="border border-line bg-paper rounded p-5">
            <p className="font-medium text-ink text-sm mb-2">{request.title}</p>
            {audit?.length ? (
              <ul className="space-y-1 text-sm text-ink/70">
                {audit.map((entry, i) => (
                  <li key={i}>{entry.action || entry}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate">No entries yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
