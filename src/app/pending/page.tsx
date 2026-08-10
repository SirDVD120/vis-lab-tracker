import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { googleSignOutAction } from "@/actions/auth";

export default async function PendingPage() {
  const state = await getAuthState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "unclaimed") redirect("/claim");
  if (state.status === "approved") redirect("/");

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Awaiting approval</p>
        <h1>Hi {state.user.name}</h1>
        <p className="lede">
          Your access request is waiting for a Head of Department to approve it.
          You won&apos;t see inventory until then. Try signing in again after they
          approve you.
        </p>
      </section>

      <div className="panel" style={{ maxWidth: 480 }}>
        <div className="panel__body stack-sm">
          <p style={{ margin: 0 }}>
            Google account: <strong>{state.google.email}</strong>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Ask your HOD to open <strong>Users</strong> and approve <strong>{state.user.name}</strong>.
          </p>
          <form action={googleSignOutAction}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
