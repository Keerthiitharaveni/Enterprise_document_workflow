import { redirect } from "next/navigation";
import RoleShell from "@/app/components/RoleShell";
import { getAuthenticatedUserProfile, getMockUserForRole, hasClerkConfig } from "@/app/lib/auth";

const NAV = [
  { href: "/admin", label: "All Requests" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit Log" },
];

export default async function AdminLayout({ children }) {
  const user = hasClerkConfig() ? await getAuthenticatedUserProfile() : getMockUserForRole("admin");

  if (!user) redirect("/sign-in");
  if (hasClerkConfig() && (!user.role || user.role !== "admin")) redirect("/access-denied?reason=wrong-role");

  return (
    <RoleShell roleKey="admin" user={user} navItems={NAV}>
      {children}
    </RoleShell>
  );
}
