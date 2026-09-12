import Link from "next/link";

export default function AccessDeniedPage({ searchParams }) {
  const reason = searchParams?.reason;

  const messages = {
    "role-not-configured": "This account does not have an application role configured yet.",
    "wrong-role": "This account is signed in, but it does not have access to this role dashboard.",
    default: "You do not have access to this SmartFlow area.",
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="max-w-lg w-full rounded border border-line bg-paper p-8 text-center">
        <p className="text-xs uppercase tracking-wide text-slate mb-3">Access denied</p>
        <h1 className="font-serif text-3xl text-ink">Enterprise Documented Workflow</h1>
        <p className="mt-4 text-sm text-slate">{messages[reason] || messages.default}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="bg-ink text-white px-4 py-2 rounded text-sm hover:bg-ink/90">
            Go home
          </Link>
          <Link href="/sign-in" className="border border-line px-4 py-2 rounded text-sm text-ink hover:bg-white">
            Sign in again
          </Link>
        </div>
      </div>
    </div>
  );
}
