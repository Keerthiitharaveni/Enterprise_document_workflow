"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { ROLES } from "@/app/lib/workflow";

const ACCENT_BG_SOFT = {
  pine: "bg-pine-soft text-pine-dark",
  steel: "bg-steel-soft text-steel",
  amber: "bg-amber-soft text-amber",
  plum: "bg-plum-soft text-plum",
  brick: "bg-brick-soft text-brick",
};

const ACCENT_DOT = {
  pine: "bg-pine",
  steel: "bg-steel",
  amber: "bg-amber",
  plum: "bg-plum",
  brick: "bg-brick",
};

export default function RoleShell({ roleKey, userName, user, navItems, children }) {
  const role = ROLES[roleKey];
  const pathname = usePathname();
  const accent = role?.accent ?? "pine";
  const profile = user || { fullName: userName || "SmartFlow User", email: "", role: roleKey, department: null, imageUrl: "" };
  const clerkEnabled = typeof process !== "undefined" && typeof process.env !== "undefined" && typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith("pk_");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-ink text-white/90 flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="font-serif text-xl tracking-tight text-white">Enterprise Documented Workflow</p>
          <p className="text-xs text-white/50 mt-0.5">Enterprise Approval Workflow</p>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <div className={`inline-flex items-center gap-2 rounded-sm px-2.5 py-1 text-xs font-medium ${ACCENT_BG_SOFT[accent]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${ACCENT_DOT[accent]}`} />
            {role?.label} view
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-sm px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 p-2.5">
            {profile.imageUrl ? (
              <img src={profile.imageUrl} alt={profile.fullName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                {profile.fullName
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/95 truncate">{profile.fullName}</p>
              <p className="text-[10px] uppercase tracking-wide text-white/45">{profile.role ? ROLES[profile.role]?.label || profile.role : role?.label}</p>
            </div>
          </div>

          <div className="rounded-sm border border-white/10 bg-white/5 p-3 text-xs text-white/75">
            <p className="mb-1 text-white/40">Profile</p>
            <p className="truncate">{profile.email}</p>
            {profile.department ? <p className="mt-1 text-white/55">{profile.department}</p> : null}
            <div className="mt-3 space-y-2">
              <Link href={navItems[0]?.href || "/"} className="block text-white/80 hover:text-white">My Profile</Link>
              <Link href={navItems[0]?.href || "/"} className="block text-white/80 hover:text-white">Settings</Link>
              {clerkEnabled ? (
                <SignOutButton>
                  <button type="button" className="block w-full text-left text-white/80 hover:text-white">Sign Out</button>
                </SignOutButton>
              ) : (
                <Link href="/" className="block text-left text-white/80 hover:text-white">Sign Out</Link>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-canvas">
        <div className="max-w-5xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
