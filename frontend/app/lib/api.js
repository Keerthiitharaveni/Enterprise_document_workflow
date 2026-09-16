// The single frontend API client. Callers obtain a Clerk session token with
// useAuth().getToken() and pass it here for every protected backend request.

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const DEMO_MODE = !(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").startsWith("pk_");

import { MOCK_REQUESTS, MOCK_USERS } from "./mockData";

async function safeFetch(path, { token, ...options } = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || `${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (DEMO_MODE) return { __offline: true, error: error.message };
    throw error;
  }
}

export async function getRequests({ status } = {}, token) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const data = await safeFetch(`/requests?${params.toString()}`, { token });
  return data?.__offline ? MOCK_REQUESTS : data;
}

export async function getRequest(id, token) {
  const data = await safeFetch(`/requests/${id}`, { token });
  return data?.__offline ? MOCK_REQUESTS.find((request) => String(request.id) === String(id)) ?? null : data;
}

export async function createRequest(payload, token) {
  const data = await safeFetch("/requests", { method: "POST", body: JSON.stringify(payload), token });
  if (!data?.__offline) return data;
  const created = { ...payload, id: `local-${Date.now()}`, status: "pending", created_at: new Date().toISOString(), created_by_name: "Requester", __local: true };
  MOCK_REQUESTS.unshift(created);
  return created;
}

export async function decideRequest(id, decision, notes, token) {
  return safeFetch(`/requests/${id}/decide`, { method: "POST", body: JSON.stringify({ decision, notes }), token });
}

export async function analyzeRequest(id, token) {
  return safeFetch(`/requests/${id}/analyze`, { method: "POST", token });
}

export async function getAuditLog(id, token) {
  const data = await safeFetch(`/requests/${id}/audit`, { token });
  return data?.__offline ? MOCK_REQUESTS.find((request) => String(request.id) === String(id))?.audit_log ?? [] : data;
}

export async function getUsers(token) {
  const data = await safeFetch("/users", { token });
  return data?.__offline ? MOCK_USERS : data;
}
