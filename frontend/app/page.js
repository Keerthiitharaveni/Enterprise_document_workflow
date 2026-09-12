import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUserProfile, ROLE_PATHS, hasClerkConfig } from "@/app/lib/auth";
import { ROLES } from "@/app/lib/workflow";
import { MOCK_USERS } from "@/app/lib/mockData";

const CARD_ACCENT = {
  pine: "hover:border-pine",
  steel: "hover:border-steel",
  amber: "hover:border-amber",
  plum: "hover:border-plum",
  brick: "hover:border-brick",
};

const DOT = {
  pine: "bg-pine",
  steel: "bg-steel",
  amber: "bg-amber",
  plum: "bg-plum",
  brick: "bg-brick",
};

export default async function SmartFlowHome() {
  const profile = await getAuthenticatedUserProfile();

  if (profile) {
    if (!profile.role) {
      redirect("/access-denied?reason=role-not-configured");
    }

    const target = ROLE_PATHS[profile.role] || "/access-denied?reason=role-not-configured";
    redirect(target);
  }

  if (!hasClerkConfig()) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
        <div className="max-w-3xl w-full">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-wide text-slate mb-2">Enterprise Documented Workflow</p>
            <h1 className="font-serif text-3xl text-ink">Enterprise Documented Workflow</h1>
            <p className="text-ink/70 mt-2 max-w-md">
              Every role sees a different desk. Pick a profile to open its dashboard and routing queue.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(ROLES).map((role) => {
              const person = MOCK_USERS.find((u) => u.role === role.key);
              return (
                <Link
                  key={role.key}
                  href={`/${role.key}`}
                  className={`block border border-line bg-paper rounded p-5 transition-colors ${CARD_ACCENT[role.accent]}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${DOT[role.accent]}`} />
                    <p className="text-sm text-slate">{role.label}</p>
                  </div>
                  <p className="font-serif text-lg text-ink">{person?.name}</p>
                  <p className="text-xs text-slate mt-1">Open {role.label.toLowerCase()} desk →</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  redirect("/sign-in");
}
