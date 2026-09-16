"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRequests } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import RequestTable from "@/app/components/RequestTable";

export default function RequesterDashboard() {
  const getToken = useApiToken();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getToken().then((token) => getRequests({}, token)).then((data) => active && setRequests(data)).catch((loadError) => active && setError(loadError.message || "Unable to load your requests."));
    return () => { active = false; };
  }, [getToken]);
  return <div><div className="flex items-start justify-between mb-8"><div><h1 className="font-serif text-2xl text-ink">My requests</h1><p className="text-sm text-slate mt-1">Everything you've submitted, and where it's stuck.</p></div><Link href="/requester/new" className="bg-pine text-white text-sm font-medium px-4 py-2 rounded hover:bg-pine-dark transition-colors">New request</Link></div>{error ? <p className="text-sm text-brick mb-4">{error}</p> : null}{requests === null ? <p className="text-sm text-slate">Loading your requests…</p> : <RequestTable requests={requests} basePath="/requester/requests" emptyLabel="You haven't submitted any requests yet." />}</div>;
}
