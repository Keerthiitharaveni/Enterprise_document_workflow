// Thin wrapper around the FastAPI backend. Every function here should map
// one-to-one to a Day 2 (or extended) backend endpoint — see the guide's
// Concept 7 note. If a call fails (e.g. backend isn't running yet), we fall
// back to MOCK_REQUESTS so the frontend is demoable on its own.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

import { MOCK_REQUESTS, MOCK_USERS } from "./mockData";

async function safeFetch(path, options) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    return { __offline: true, error: err.message };
  }
}

export async function getRequests({ role, status } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  const data = await safeFetch(`/requests?${params.toString()}`);
  if (data?.__offline) {
    let list = MOCK_REQUESTS;
    if (status) list = list.filter((r) => r.status === status);
    return list;
  }
  return data;
}

export async function getRequest(id) {
  const data = await safeFetch(`/requests/${id}`);
  if (data?.__offline) {
    return MOCK_REQUESTS.find((r) => String(r.id) === String(id)) ?? null;
  }
  return data;
}

export async function createRequest(payload) {
  const data = await safeFetch(`/requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (data?.__offline) {
    const created = {
      ...payload,
      id: `local-${Date.now()}`,
      status: "pending",
      created_at: new Date().toISOString(),
      created_by_name: payload.created_by_name || "Requester",
      __local: true,
    };

    MOCK_REQUESTS.unshift(created);
    return created;
  }
  return data;
}

export async function decideRequest(id, decision, notes, approverId) {
  const data = await safeFetch(`/requests/${id}/decide`, {
    method: "POST",
    body: JSON.stringify({ decision, notes, approver_id: approverId }),
  });
  return data;
}

export async function analyzeRequest(id) {
  const data = await safeFetch(`/requests/${id}/analyze`, { method: "POST" });
  if (data?.__offline) {
    return {
      risk_score: "medium",
      summary:
        "Offline preview — connect the backend to see a live AI risk read for this request.",
      flags: ["Backend not reachable"],
    };
  }
  return data;
}

export async function getAuditLog(id) {
  const data = await safeFetch(`/requests/${id}/audit`);
  if (data?.__offline) {
    return MOCK_REQUESTS.find((r) => String(r.id) === String(id))?.audit_log ?? [];
  }
  return data;
}

export async function getUsers({ role } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  const data = await safeFetch(`/users?${params.toString()}`);
  if (data?.__offline) {
    return role ? MOCK_USERS.filter((u) => u.role === role) : MOCK_USERS;
  }
  return data;
}
