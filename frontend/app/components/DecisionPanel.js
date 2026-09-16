"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideRequest, analyzeRequest } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";

export default function DecisionPanel({ request, canDecide }) {
  const router = useRouter();
  const getToken = useApiToken();
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState(request?.metadata?.analysis ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    setAnalyzing(true); setError("");
    try { setAnalysis(await analyzeRequest(request.id, await getToken())); }
    catch (requestError) { setError(requestError.message || "Unable to run analysis."); }
    finally { setAnalyzing(false); }
  }

  async function decide(decision) {
    setDeciding(true); setError("");
    try {
      await decideRequest(request.id, decision, notes, await getToken());
      router.push(".");
      router.refresh();
    } catch (requestError) { setError(requestError.message || "Unable to record the decision."); }
    finally { setDeciding(false); }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-brick">{error}</p> : null}
      <div className="border border-line bg-paper rounded p-6">
        <div className="flex items-center justify-between mb-3"><p className="text-xs uppercase tracking-wide text-slate">AI risk read</p>{!analysis && <button onClick={runAnalysis} disabled={analyzing} className="text-xs font-medium text-pine hover:text-pine-dark disabled:opacity-50">{analyzing ? "Analyzing…" : "Run analysis"}</button>}</div>
        {analysis ? <div><p className="text-xs font-medium text-amber uppercase mb-2">Risk: {analysis.risk_score}</p><p className="text-sm text-ink/80 mb-2">{analysis.summary}</p></div> : <p className="text-sm text-slate">No analysis run yet for this request.</p>}
      </div>
      {canDecide && <div className="border border-line bg-paper rounded p-6"><p className="text-xs uppercase tracking-wide text-slate mb-3">Your decision</p><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the audit trail" rows={3} className="w-full border border-line rounded px-3 py-2 text-sm bg-paper mb-3 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine" /><div className="flex gap-3"><button onClick={() => decide("approved")} disabled={deciding} className="bg-pine text-white text-sm font-medium px-4 py-2 rounded hover:bg-pine-dark transition-colors disabled:opacity-60">Approve</button><button onClick={() => decide("rejected")} disabled={deciding} className="bg-paper border border-brick text-brick text-sm font-medium px-4 py-2 rounded hover:bg-brick-soft transition-colors disabled:opacity-60">Reject</button></div></div>}
    </div>
  );
}
