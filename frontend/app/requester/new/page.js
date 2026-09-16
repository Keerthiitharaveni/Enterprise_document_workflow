"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRequest } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import { ROUTING_CHAINS, ROLES } from "@/app/lib/workflow";

const TYPE_OPTIONS = Object.entries(ROUTING_CHAINS);

export default function NewRequestPage() {
  const router = useRouter();
  const getToken = useApiToken();
  const [requestType, setRequestType] = useState("leave");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const meta = ROUTING_CHAINS[requestType];
  const needsVendor = requestType === "purchase" || requestType === "capex";

  async function handleSubmit(event) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await createRequest({ title, description, request_type: requestType, amount: Number(amount), vendor: needsVendor ? vendor : null }, await getToken());
      router.push("/requester"); router.refresh();
    } catch (submitError) {
      setError(submitError.message || "Unable to submit the request.");
    } finally { setSaving(false); }
  }

  return <div><h1 className="font-serif text-2xl text-ink mb-1">New request</h1><p className="text-sm text-slate mb-8">Choose a request type and provide the details for approval.</p><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5"><div><label className="block text-sm font-medium text-ink mb-1.5">Request type</label><div className="grid grid-cols-2 gap-2">{TYPE_OPTIONS.map(([key, value]) => <button type="button" key={key} onClick={() => setRequestType(key)} className={`text-left border rounded px-3 py-2.5 text-sm transition-colors ${requestType === key ? "border-pine bg-pine-soft text-pine-dark font-medium" : "border-line bg-paper text-ink/70 hover:border-ink/30"}`}>{value.label}</button>)}</div></div><div><label className="block text-sm font-medium text-ink mb-1.5">Title</label><input required value={title} onChange={(event) => setTitle(event.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine" /></div><div><label className="block text-sm font-medium text-ink mb-1.5">Description</label><textarea required rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine" /></div><div><label className="block text-sm font-medium text-ink mb-1.5">Amount (₹)</label><input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine" /></div>{needsVendor && <div><label className="block text-sm font-medium text-ink mb-1.5">Vendor</label><input value={vendor} onChange={(event) => setVendor(event.target.value)} className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine" /></div>}{error ? <p className="text-sm text-brick">{error}</p> : null}<button type="submit" disabled={saving} className="bg-pine text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-pine-dark transition-colors disabled:opacity-60">{saving ? "Submitting…" : "Submit request"}</button></form><aside className="border border-line bg-paper rounded p-5 h-fit"><p className="text-xs uppercase tracking-wide text-slate mb-3">Approval routing</p><ol className="space-y-3">{meta.chain.map((roleKey, index) => <li key={roleKey} className="flex items-center gap-3"><span className="h-6 w-6 rounded-full bg-canvas text-ink/60 text-xs font-medium flex items-center justify-center border border-line">{index + 1}</span><span className="text-sm text-ink">{ROLES[roleKey].label}</span></li>)}</ol><p className="text-xs text-slate mt-4 pt-4 border-t border-line">{meta.description} Requests below ₹50,000 stop after manager approval.</p></aside></div></div>;
}
