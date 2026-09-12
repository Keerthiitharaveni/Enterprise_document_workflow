import { getUsers } from "@/app/lib/api";
import { ROLES } from "@/app/lib/workflow";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers({});

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink mb-1">Users</h1>
      <p className="text-sm text-slate mb-8">Everyone with access, by role.</p>

      <div className="border border-line bg-paper rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-ink">{u.name}</td>
                <td className="px-4 py-3 text-ink/70">{ROLES[u.role]?.label ?? u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
