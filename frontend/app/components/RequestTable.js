import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { ROUTING_CHAINS } from "@/app/lib/workflow";

export default function RequestTable({ requests, basePath, emptyLabel }) {
  if (!requests?.length) {
    return (
      <div className="border border-dashed border-line rounded p-10 text-center">
        <p className="text-sm text-slate">{emptyLabel || "Nothing here yet."}</p>
      </div>
    );
  }

  return (
    <div className="border border-line rounded bg-paper overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-slate">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0 hover:bg-canvas/60">
              <td className="px-4 py-3">
                <Link href={`${basePath}/${r.id}`} className="text-ink font-medium hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-ink/70">
                {ROUTING_CHAINS[r.request_type]?.label ?? r.request_type}
              </td>
              <td className="px-4 py-3 text-ink/70">
                {r.amount ? `₹${Number(r.amount).toLocaleString("en-IN")}` : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-ink/70">
                {new Date(r.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
