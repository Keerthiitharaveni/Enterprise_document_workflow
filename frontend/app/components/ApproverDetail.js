"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRequest, getAuditLog } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import { isRolesTurn } from "@/app/lib/workflow";
import StatusBadge from "./StatusBadge";
import ApprovalStepper from "./ApprovalStepper";
import DecisionPanel from "./DecisionPanel";

export default function ApproverDetail({ id, roleKey, basePath }) {
  const getToken = useApiToken();
  const [request, setRequest] = useState(null);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const token = await getToken();
        const [nextRequest, nextAudit] = await Promise.all([getRequest(id, token), getAuditLog(id, token)]);
        if (active) {
          setRequest(nextRequest);
          setAudit(nextAudit);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load this request.");
      }
    }
    load();
    return () => { active = false; };
  }, [getToken, id]);

  if (error) return <p className="text-sm text-brick">{error}</p>;
  if (!request) return <p className="text-sm text-slate">Loading request…</p>;

  return (
    <div>
      <Link href={basePath} className="text-xs text-slate hover:text-ink mb-6 inline-block">← Queue</Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-ink">{request.title}</h1>
          <p className="text-sm text-slate mt-1">Submitted by {request.created_by_name} · {request.description}</p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      <div className="border border-line bg-paper rounded p-6 mb-6"><ApprovalStepper request={request} /></div>
      <div className="border border-line bg-paper rounded p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div><p className="text-slate">Amount</p><p className="text-ink font-medium">₹{Number(request.amount).toLocaleString("en-IN")}</p></div>
        <div><p className="text-slate">Submitted</p><p className="text-ink font-medium">{new Date(request.created_at).toLocaleDateString("en-IN")}</p></div>
      </div>
      <DecisionPanel request={request} canDecide={isRolesTurn(request, roleKey)} />
      <div className="border border-line bg-paper rounded p-6 mt-6">
        <p className="text-xs uppercase tracking-wide text-slate mb-3">Previous decisions and audit trail</p>
        {audit?.length ? <ul className="space-y-2 text-sm">{audit.map((entry) => <li key={entry.id} className="text-ink/80">{entry.action}{entry.details?.decision ? `: ${entry.details.decision}` : ""}</li>)}</ul> : <p className="text-sm text-slate">No activity recorded yet.</p>}
      </div>
    </div>
  );
}
