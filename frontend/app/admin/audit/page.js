"use client";

import { useEffect, useState } from "react";
import { getRequests, getAuditLog } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";

export default function AuditPage() {
  const getToken = useApiToken(); const [records, setRecords] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; async function load() { try { const token = await getToken(); const requests = await getRequests({}, token); const audit = await Promise.all(requests.map(async (request) => ({ request, audit: await getAuditLog(request.id, token) }))); if (active) setRecords(audit); } catch (loadError) { if (active) setError(loadError.message || "Unable to load audit records."); } } load(); return () => { active = false; }; }, [getToken]);
  return <div><h1 className="font-serif text-2xl text-ink mb-1">Audit log</h1><p className="text-sm text-slate mb-8">Every recorded action, grouped by request.</p>{error ? <p className="text-sm text-brick mb-4">{error}</p> : null}{records === null ? <p className="text-sm text-slate">Loading audit records…</p> : <div className="space-y-4">{records.map(({ request, audit }) => <div key={request.id} className="border border-line bg-paper rounded p-5"><p className="font-medium text-ink text-sm mb-2">{request.title}</p>{audit.length ? <ul className="space-y-1 text-sm text-ink/70">{audit.map((entry) => <li key={entry.id}>{entry.action}{entry.details?.decision ? `: ${entry.details.decision}` : ""}</li>)}</ul> : <p className="text-xs text-slate">No entries yet.</p>}</div>)}</div>}</div>;
}
