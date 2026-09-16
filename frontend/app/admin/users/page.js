"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/app/lib/api";
import { useApiToken } from "@/app/lib/clientAuth";
import { ROLES } from "@/app/lib/workflow";

export default function UsersPage() {
  const getToken = useApiToken(); const [users, setUsers] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; getToken().then((token) => getUsers(token)).then((data) => active && setUsers(data)).catch((loadError) => active && setError(loadError.message || "Unable to load users.")); return () => { active = false; }; }, [getToken]);
  return <div><h1 className="font-serif text-2xl text-ink mb-1">Users</h1><p className="text-sm text-slate mb-8">Everyone with access, by application role.</p>{error ? <p className="text-sm text-brick mb-4">{error}</p> : null}{users === null ? <p className="text-sm text-slate">Loading users…</p> : <div className="border border-line bg-paper rounded overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-line text-left text-slate"><th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Role</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-line last:border-0"><td className="px-4 py-3 text-ink">{user.name}</td><td className="px-4 py-3 text-ink/70">{ROLES[user.application_role]?.label || user.role}</td></tr>)}</tbody></table></div>}</div>;
}
