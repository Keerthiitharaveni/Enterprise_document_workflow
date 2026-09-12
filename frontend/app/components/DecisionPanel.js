"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideRequest, analyzeRequest } from "@/app/lib/api";

export default function DecisionPanel({ request, approverId, canDecide }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [analysis, setAnalysis] = useState(request?.metadata?.analysis ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deciding, setDeciding] = useState(false);

  async function runAnalysis() {
    setAnalyzing(true);
    const result = await analyzeRequest(request.id);
    setAnalysis(result);
    setAnalyzing(false);
  }

  async function decide(decision) {
    setDeciding(true);
    await decideRequest(request.id, decision, notes, approverId);
    setDeciding(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="border border-line bg-paper rounded p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-slate">AI risk read</p>
          {!analysis && (
            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="text-xs font-medium text-pine hover:text-pine-dark disabled:opacity-50"
            >
              {analyzing ? "Analyzing…" : "Run analysis"}
            </button>
          )}
        </div>
        {analysis ? (
          <div>
            <p className="text-xs font-medium text-amber uppercase mb-2">
              Risk: {analysis.risk_score}
            </p>
            <p className="text-sm text-ink/80 mb-2">{analysis.summary}</p>
            {analysis.flags?.length > 0 && (
              <ul className="text-xs text-brick list-disc list-inside space-y-0.5">
                {analysis.flags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate mt-3 pt-3 border-t border-line">
              AI-generated — advisory only, human decision required.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate">No analysis run yet for this request.</p>
        )}
      </div>

      {canDecide && (
        <div className="border border-line bg-paper rounded p-6">
          <p className="text-xs uppercase tracking-wide text-slate mb-3">Your decision</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the audit trail"
            rows={3}
            className="w-full border border-line rounded px-3 py-2 text-sm bg-paper mb-3 focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
          />
          <div className="flex gap-3">
            <button
              onClick={() => decide("approved")}
              disabled={deciding}
              className="bg-pine text-white text-sm font-medium px-4 py-2 rounded hover:bg-pine-dark transition-colors disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => decide("rejected")}
              disabled={deciding}
              className="bg-paper border border-brick text-brick text-sm font-medium px-4 py-2 rounded hover:bg-brick-soft transition-colors disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
