import Link from "next/link";
import { getRequests } from "@/app/lib/api";
import RequestTable from "@/app/components/RequestTable";
import { MOCK_USERS } from "@/app/lib/mockData";

export const dynamic = "force-dynamic";

export default async function RequesterDashboard() {
  const user = MOCK_USERS.find((u) => u.role === "requester");
  const all = await getRequests({});
  // Frontend-only scoping: created_by is already returned by GET /requests,
  // so "My Requests" needs no backend change — filter client/server-side here.
  const mine = (all || []).filter((r) => r.created_by === user?.id);

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl text-ink">My requests</h1>
          <p className="text-sm text-slate mt-1">
            Everything you've submitted, and where it's stuck.
          </p>
        </div>
        <Link
          href="/requester/new"
          className="bg-pine text-white text-sm font-medium px-4 py-2 rounded hover:bg-pine-dark transition-colors"
        >
          New request
        </Link>
      </div>

      <RequestTable
        requests={mine}
        basePath="/requester/requests"
        emptyLabel="You haven't submitted any requests yet."
      />
    </div>
  );
}
