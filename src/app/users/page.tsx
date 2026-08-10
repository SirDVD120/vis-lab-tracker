import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getSession, listUsers } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { addUserAction, updateUserPermissionsAction } from "@/actions/items";

export default async function UsersPage() {
  const user = await getSession();
  if (!user?.canManageUsers) {
    redirect("/account");
  }

  const users = await listUsers();

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Admin</p>
        <h1>Authorised users</h1>
        <p className="lede">
          Control who can sign items out. Only Mark and David can edit this list
          for now. Google accounts will plug in later.
        </p>
      </section>

      <div className="detail-grid">
        <div className="panel">
          <div className="panel__header">
            <h2>People</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="muted" style={{ fontSize: "0.82rem" }}>
                        Added {format(row.createdAt, "dd MMM yyyy")}
                      </div>
                    </td>
                    <td>{roleLabel(row.role)}</td>
                    <td>
                      <form id={`user-${row.id}`} action={updateUserPermissionsAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            name="canSignOut"
                            defaultChecked={row.canSignOut}
                          />
                          Can sign out
                        </label>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            name="canManageUsers"
                            defaultChecked={row.canManageUsers}
                          />
                          Manage users
                        </label>
                      </form>
                    </td>
                    <td>
                      <button form={`user-${row.id}`} type="submit" className="btn btn-ghost btn-sm">
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <h2>Add person</h2>
          </div>
          <div className="panel__body">
            <form action={addUserAction} className="stack-sm">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" required placeholder="Full name" />
              </div>
              <button type="submit" className="btn btn-primary">
                Add to list
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
