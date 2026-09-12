"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRequest } from "@/app/lib/api";
import { ROUTING_CHAINS, ROLES } from "@/app/lib/workflow";
import { MOCK_USERS } from "@/app/lib/mockData";

const TYPE_OPTIONS = Object.entries(ROUTING_CHAINS);

export default function NewRequestPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState("leave");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [saving, setSaving] = useState(false);

  const meta = ROUTING_CHAINS[requestType];
  const needsAmount = requestType !== "leave";
  const needsVendor = requestType === "purchase" || requestType === "capex";
  const user = MOCK_USERS.find((u) => u.role === "requester");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await createRequest({
      title,
      description,
      request_type: requestType,
      amount: needsAmount ? Number(amount) : null,
      vendor: needsVendor ? vendor : null,
      created_by: user?.id,
    });
    setSaving(false);
    router.push("/requester");
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">New request</h1>
      <p className="text-sm text-slate mb-8">
        Pick a type — the routing slip on the right updates to show exactly
        who signs off, in order.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Request type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(([key, val]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setRequestType(key)}
                  className={`text-left border rounded px-3 py-2.5 text-sm transition-colors ${
                    requestType === key
                      ? "border-pine bg-pine-soft text-pine-dark font-medium"
                      : "border-line bg-paper text-ink/70 hover:border-ink/30"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={requestType === "leave" ? "e.g. Annual leave — Diwali week" : "e.g. Laptops for new hires (x4)"}
              className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give approvers enough context to decide without follow-up questions."
              className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
            />
          </div>

          {needsAmount && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Amount (₹)
              </label>
              <input
                required
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
              />
            </div>
          )}

          {needsVendor && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                Vendor
              </label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full border border-line rounded px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-pine text-white text-sm font-medium px-5 py-2.5 rounded hover:bg-pine-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>

        <aside className="border border-line bg-paper rounded p-5 h-fit">
          <p className="text-xs uppercase tracking-wide text-slate mb-3">
            This will route to
          </p>
          <ol className="space-y-3">
            {meta.chain.map((roleKey, i) => (
              <li key={roleKey} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-canvas text-ink/60 text-xs font-medium flex items-center justify-center border border-line">
                  {i + 1}
                </span>
                <span className="text-sm text-ink">{ROLES[roleKey].label}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate mt-4 pt-4 border-t border-line">
            {meta.description}
          </p>
        </aside>
      </div>
    </div>
  );
}
