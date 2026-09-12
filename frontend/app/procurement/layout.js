import { redirect } from "next/navigation";
import RoleShell from "@/app/components/RoleShell";
import { getAuthenticatedUserProfile, getMockUserForRole, hasClerkConfig } from "@/app/lib/auth";

const NAV = [
  { href: "/procurement", label: "Approval Queue" },
];

export default async function ProcurementLayout({ children }) {
  const user = hasClerkConfig() ? await getAuthenticatedUserProfile() : getMockUserForRole("procurement");

  if (!user) redirect("/sign-in");
  if (hasClerkConfig() && (!user.role || user.role !== "procurement")) redirect("/access-denied?reason=wrong-role");

  return (
    <RoleShell roleKey="procurement" user={user} navItems={NAV}>
      {children}
    </RoleShell>
  );
}
