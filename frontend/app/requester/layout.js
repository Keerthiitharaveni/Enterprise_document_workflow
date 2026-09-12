import { redirect } from "next/navigation";
import RoleShell from "@/app/components/RoleShell";
import { getAuthenticatedUserProfile, getMockUserForRole, hasClerkConfig } from "@/app/lib/auth";

const NAV = [
  { href: "/requester", label: "My Requests" },
  { href: "/requester/new", label: "New Request" },
];

export default async function RequesterLayout({ children }) {
  const user = hasClerkConfig() ? await getAuthenticatedUserProfile() : getMockUserForRole("requester");

  if (!user) redirect("/sign-in");
  if (hasClerkConfig() && (!user.role || user.role !== "requester")) redirect("/access-denied?reason=wrong-role");

  return (
    <RoleShell roleKey="requester" user={user} navItems={NAV}>
      {children}
    </RoleShell>
  );
}
