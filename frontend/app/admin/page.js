import { getRequests } from "@/app/lib/api";
import RequestTable from "@/app/components/RequestTable";
import { ROUTING_CHAINS, ROLES } from "@/app/lib/workflow";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const all = await getRequests({});

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">All requests</h1>
      <p className="text-sm text-slate mb-8">
        Full visibility across every request type and stage.
      </p>

      <RequestTable requests={all} basePath="/admin/requests" />

      <h2 className="font-serif text-lg text-ink mt-10 mb-3">Routing rules</h2>
      <p className="text-sm text-slate mb-4">
        The four request types and their approval chains, as currently
        configured on the frontend. Keep this in sync with the backend's
        routing table.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(ROUTING_CHAINS).map(([key, meta]) => (
          <div key={key} className="border border-line bg-paper rounded p-4">
            <p className="font-medium text-ink text-sm mb-1">{meta.label}</p>
            <p className="text-xs text-slate mb-3">{meta.description}</p>
            <p className="text-xs text-ink/70">
              {meta.chain.map((r) => ROLES[r].label).join(" → ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
