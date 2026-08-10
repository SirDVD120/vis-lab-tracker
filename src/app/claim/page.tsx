import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { claimNameAction, googleSignOutAction } from "@/actions/auth";

export default async function ClaimPage() {
  const state = await getAuthState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "pending") redirect("/pending");
  if (state.status === "approved") redirect("/");

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">First sign-in</p>
        <h1>What&apos;s your name?</h1>
        <p className="lede">
          Signed in as <strong>{state.google.email}</strong>. Enter the name your
          department knows you by. Linking a second Google account to an existing name
          still needs HOD approval.
        </p>
      </section>

      <div className="panel" style={{ maxWidth: 480 }}>
        <div className="panel__body">
          <form action={claimNameAction} className="stack-sm">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                placeholder="e.g. David"
                defaultValue={state.google.name?.split(" ")[0] ?? ""}
              />
            </div>
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 600, marginBottom: "0.35rem" }}>I am a</legend>
              <label className="checkbox-row">
                <input type="radio" name="accountType" value="STAFF" defaultChecked />
                Teacher / staff
              </label>
              <label className="checkbox-row">
                <input type="radio" name="accountType" value="STUDENT" />
                Lab club student (browse only)
              </label>
            </fieldset>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Request access
              </button>
            </div>
          </form>
          <form action={googleSignOutAction} style={{ marginTop: "1rem" }}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Use a different Google account
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
