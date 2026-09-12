import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/requester(.*)",
  "/manager(.*)",
  "/finance(.*)",
  "/procurement(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

  if (!publishableKey.startsWith("pk_")) {
    return;
  }

  if (isProtectedRoute(req)) {
    const { userId } = await auth();

    if (!userId) {
      return Response.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*|favicon.ico).*)",
  ],
};
