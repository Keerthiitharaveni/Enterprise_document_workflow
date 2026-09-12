import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { hasClerkConfig } from "@/app/lib/auth";

export default function SignInPage() {
  if (!hasClerkConfig()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-md rounded border border-line bg-paper p-8 text-center">
          <p className="text-xs uppercase tracking-wide text-slate">SmartFlow auth setup</p>
          <h1 className="mt-3 font-serif text-3xl text-ink">Clerk keys required</h1>
          <p className="mt-4 text-sm text-slate">
            Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to your environment, then reload the app.
          </p>
          <Link href="/" className="mt-6 inline-block rounded bg-ink px-4 py-2 text-sm text-white">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
        afterSignUpUrl="/"
      />
    </div>
  );
}
