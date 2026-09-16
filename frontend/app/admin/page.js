"use client";

import { useEffect, useState } from "react";
import { getRequests } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import RequestTable from "@/app/components/RequestTable";
import { ROUTING_CHAINS, ROLES } from "@/app/lib/workflow";

export default function AdminDashboard() {
  const getToken = useApiToken(); const [requests, setRequests] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; getToken().then((token) => getRequests({}, token)).then((data) => active && setRequests(data)).catch((loadError) => active && setError(loadError.message || "Unable to load requests.")); return () => { active = false; }; }, [getToken]);
  return <div><h1 className="font-serif text-2xl text-ink mb-1">All requests</h1><p className="text-sm text-slate mb-8">Full visibility across every request type and stage.</p>{error ? <p className="text-sm text-brick mb-4">{error}</p> : null}{requests === null ? <p className="text-sm text-slate">Loading requests…</p> : <RequestTable requests={requests} basePath="/admin/requests" />}<h2 className="font-serif text-lg text-ink mt-10 mb-3">Routing rules</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Object.entries(ROUTING_CHAINS).map(([key, meta]) => <div key={key} className="border border-line bg-paper rounded p-4"><p className="font-medium text-ink text-sm mb-1">{meta.label}</p><p className="text-xs text-slate mb-3">{meta.description}</p><p className="text-xs text-ink/70">{meta.chain.map((role) => ROLES[role].label).join(" → ")}</p></div>)}</div></div>;
}
