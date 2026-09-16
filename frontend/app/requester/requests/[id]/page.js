"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRequest, getAuditLog } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import StatusBadge from "@/app/components/StatusBadge";
import ApprovalStepper from "@/app/components/ApprovalStepper";

export default function RequestDetail({ params }) {
  const getToken = useApiToken();
  const [request, setRequest] = useState(null); const [audit, setAudit] = useState([]); const [error, setError] = useState("");
  useEffect(() => { let active = true; getToken().then(async (token) => Promise.all([getRequest(params.id, token), getAuditLog(params.id, token)])).then(([nextRequest, nextAudit]) => { if (active) { setRequest(nextRequest); setAudit(nextAudit); } }).catch((loadError) => active && setError(loadError.message || "Unable to load this request.")); return () => { active = false; }; }, [getToken, params.id]);
  if (error) return <p className="text-sm text-brick">{error}</p>;
  if (!request) return <p className="text-sm text-slate">Loading request…</p>;
  return <div><Link href="/requester" className="text-xs text-slate hover:text-ink mb-6 inline-block">← My requests</Link><div className="flex items-start justify-between mb-6"><div><h1 className="font-serif text-2xl text-ink">{request.title}</h1><p className="text-sm text-slate mt-1">{request.description}</p></div><StatusBadge status={request.status} /></div><div className="border border-line bg-paper rounded p-6 mb-6"><ApprovalStepper request={request} /></div><div className="border border-line bg-paper rounded p-6 mb-6 grid grid-cols-2 gap-4 text-sm"><div><p className="text-slate">Request ID</p><p className="text-ink font-medium">#{request.id}</p></div><div><p className="text-slate">Amount</p><p className="text-ink font-medium">₹{Number(request.amount).toLocaleString("en-IN")}</p></div><div><p className="text-slate">Created</p><p className="text-ink font-medium">{new Date(request.created_at).toLocaleDateString("en-IN")}</p></div><div><p className="text-slate">Current stage</p><p className="text-ink font-medium">{request.current_stage}{request.current_approver_name ? ` — ${request.current_approver_name}` : ""}</p><p className="text-xs text-slate">{request.current_step_order ? `Step ${request.current_step_order} of ${request.total_approval_steps}` : ""}</p></div></div><div className="border border-line bg-paper rounded p-6"><p className="text-xs uppercase tracking-wide text-slate mb-3">Audit trail</p>{audit?.length ? <ul className="space-y-2 text-sm">{audit.map((entry) => <li key={entry.id} className="text-ink/80">{entry.action}{entry.details?.decision ? `: ${entry.details.decision}` : ""}</li>)}</ul> : <p className="text-sm text-slate">No activity recorded yet.</p>}</div></div>;
}
