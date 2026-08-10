import { getSession, listUsers } from "@/lib/auth";
import { AccountSwitcher } from "@/components/AccountSwitcher";
import { clearAccountAction } from "@/actions/auth";

export default async function AccountPage() {
  const [user, users] = await Promise.all([getSession(), listUsers()]);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Temporary auth</p>
        <h1>Switch account</h1>
        <p className="lede">
          Click a name to act as that person. Google Auth will replace this later.
          Mark and David can manage who is allowed to sign items out.
        </p>
      </section>

      <div className="panel">
        <div className="panel__header">
          <h2>{user ? `Signed in as ${user.name}` : "No account selected"}</h2>
          {user ? (
            <form action={clearAccountAction}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Clear selection
              </button>
            </form>
          ) : null}
        </div>
        <div className="panel__body">
          <AccountSwitcher users={users} activeUserId={user?.id ?? null} />
        </div>
      </div>
    </main>
  );
}
