import { redirect } from "next/navigation";
import RoleShell from "@/app/components/RoleShell";
import { getAuthenticatedUserProfile, getMockUserForRole, hasClerkConfig } from "@/app/lib/auth";

const NAV = [
  { href: "/finance", label: "Approval Queue" },
];

export default async function FinanceLayout({ children }) {
  const user = hasClerkConfig() ? await getAuthenticatedUserProfile() : getMockUserForRole("finance");

  if (!user) redirect("/sign-in");
  if (hasClerkConfig() && (!user.role || user.role !== "finance")) redirect("/access-denied?reason=wrong-role");

  return (
    <RoleShell roleKey="finance" user={user} navItems={NAV}>
      {children}
    </RoleShell>
  );
}
