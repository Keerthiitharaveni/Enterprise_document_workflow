import { currentUser } from "@clerk/nextjs/server";
import { ROLES } from "@/app/lib/workflow";

export const ROLE_PATHS = {
  requester: "/requester",
  manager: "/manager",
  finance: "/finance",
  procurement: "/procurement",
  admin: "/admin",
};

export function hasClerkConfig() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  return key.startsWith("pk_");
}

export function getMockUserForRole(roleKey) {
  const captions = {
    requester: { name: "Ananya Rao", email: "ananya.rao@smartflow.local", department: "Product" },
    manager: { name: "Vikram Shah", email: "vikram.shah@smartflow.local", department: "Operations" },
    finance: { name: "Priya Menon", email: "priya.menon@smartflow.local", department: "Finance" },
    procurement: { name: "Rahul Verma", email: "rahul.verma@smartflow.local", department: "Procurement" },
    admin: { name: "Deepa Iyer", email: "deepa.iyer@smartflow.local", department: "Admin" },
  };

  const config = captions[roleKey] || captions.requester;
  return {
    id: roleKey,
    fullName: config.name,
    email: config.email,
    imageUrl: "",
    role: roleKey,
    department: config.department,
  };
}

export function getAllowedRolePaths() {
  return Object.keys(ROLE_PATHS);
}

export function normalizeRole(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized in ROLES ? normalized : null;
}

export async function getAuthenticatedUserProfile() {
  if (!hasClerkConfig()) {
    return null;
  }

  const user = await currentUser();
  if (!user) return null;

  const appRole = normalizeRole(
    user.publicMetadata?.role || user.privateMetadata?.role || user.unsafeMetadata?.role
  );

  return {
    id: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    fullName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "SmartFlow User",
    email: user.emailAddresses?.[0]?.emailAddress || "",
    imageUrl: user.imageUrl || "",
    role: appRole,
    department: user.publicMetadata?.department || user.privateMetadata?.department || user.unsafeMetadata?.department || null,
  };
}

export async function getCurrentRole() {
  const user = await getAuthenticatedUserProfile();
  return user?.role ?? null;
}

export async function requireRole(role) {
  const profile = await getAuthenticatedUserProfile();
  if (!profile) return { authorized: false, profile: null, reason: "signed_out" };

  if (!profile.role) {
    return { authorized: false, profile, reason: "role_missing" };
  }

  if (profile.role !== role) {
    return { authorized: false, profile, reason: "wrong_role" };
  }

  return { authorized: true, profile, reason: null };
}
