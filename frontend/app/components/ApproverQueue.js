"use client";

import { useEffect, useState } from "react";
import { getRequests } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import RequestTable from "./RequestTable";
import { ROLES } from "@/app/lib/workflow";

export default function ApproverQueue({ roleKey, basePath }) {
  const getToken = useApiToken();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const token = await getToken();
        const data = await getRequests({}, token);
        if (active) setRequests(data);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load your assigned requests.");
      }
    }
    load();
    return () => { active = false; };
  }, [getToken]);

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">{ROLES[roleKey].label} queue</h1>
      <p className="text-sm text-slate mb-8">Requests currently waiting on your decision.</p>
      {error ? <p className="text-sm text-brick mb-4">{error}</p> : null}
      {requests === null ? <p className="text-sm text-slate">Loading assigned requests…</p> : (
        <RequestTable requests={requests} basePath={basePath} emptyLabel="Nothing waiting on you right now." />
      )}
    </div>
  );
}
