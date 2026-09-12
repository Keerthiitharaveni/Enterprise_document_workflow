import { redirect } from "next/navigation";
import RoleShell from "@/app/components/RoleShell";
import { getAuthenticatedUserProfile, getMockUserForRole, hasClerkConfig } from "@/app/lib/auth";

const NAV = [
  { href: "/manager", label: "Approval Queue" },
];

export default async function ManagerLayout({ children }) {
  const user = hasClerkConfig() ? await getAuthenticatedUserProfile() : getMockUserForRole("manager");

  if (!user) redirect("/sign-in");
  if (hasClerkConfig() && (!user.role || user.role !== "manager")) redirect("/access-denied?reason=wrong-role");

  return (
    <RoleShell roleKey="manager" user={user} navItems={NAV}>
      {children}
    </RoleShell>
  );
}
