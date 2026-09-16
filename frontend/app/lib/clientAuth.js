"use client";

import { useAuth } from "@clerk/nextjs";

// The application retains its existing local-preview mode when Clerk is not
// configured. In a Clerk deployment this always returns the signed-in session
// token used by the protected FastAPI API.
const clerkEnabled = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "").startsWith("pk_");

export function useApiToken() {
  if (!clerkEnabled) return async () => null;
  return useAuth().getToken;
}
