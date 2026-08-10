import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { googleSignInAction } from "@/actions/auth";

export default async function LoginPage() {
  const state = await getAuthState();
  if (state.status === "approved") redirect("/");
  if (state.status === "pending") redirect("/pending");
  if (state.status === "unclaimed") redirect("/claim");

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">VIS Science</p>
        <h1>Sign in</h1>
        <p className="lede">
          Use your school or personal Google account. After your first sign-in, the
          Head of Department must approve you before you can use the tracker.
        </p>
      </section>

      <div className="panel" style={{ maxWidth: 420 }}>
        <div className="panel__body">
          <form action={googleSignInAction}>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Continue with Google
            </button>
          </form>
          <p className="muted" style={{ marginBottom: 0, marginTop: "1rem", fontSize: "0.92rem" }}>
            You can link more than one Google account to the same name later.
          </p>
        </div>
      </div>
    </main>
  );
}
