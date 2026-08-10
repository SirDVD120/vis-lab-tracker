import { redirect } from "next/navigation";
import { format } from "date-fns";
import { isHod, listUsers, requireApprovedPage } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import {
  approveUserAction,
  deleteUserAction,
  removeGoogleAccountAction,
  updateUserPermissionsAction,
} from "@/actions/auth";

export default async function UsersPage() {
  const user = await requireApprovedPage();
  if (!isHod(user)) {
    redirect("/");
  }

  const users = await listUsers();
  const pending = users.filter(
    (u) => u.status === "PENDING" && u.googleAccounts.length > 0,
  );
  const active = users.filter(
    (u) => u.status === "APPROVED" && u.googleAccounts.length > 0,
  );

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">HOD</p>
        <h1>User access</h1>
        <p className="lede">
          Approve new teachers, set who can sign items out or edit the catalog, and
          grant HOD to others. Remove people when they leave.
        </p>
      </section>

      <div className="stack-sm">
        <div className="panel">
          <div className="panel__header">
            <h2>Pending approval ({pending.length})</h2>
          </div>
          {pending.length === 0 ? (
            <div className="empty">No pending requests.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Google</th>
                    <th>Permissions</th>
                    <th>Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          Requested {format(row.createdAt, "dd MMM yyyy")}
                        </div>
                      </td>
                      <td>
                        {row.googleAccounts.map((g) => (
                          <div key={g.id} className="sku">
                            {g.email}
                          </div>
                        ))}
                      </td>
                      <td>
                        <form id={`approve-${row.id}`} action={approveUserAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <label className="checkbox-row">
                            <input type="checkbox" name="canSignOut" defaultChecked />
                            Can sign out
                          </label>
                          <label className="checkbox-row">
                            <input type="checkbox" name="canManageUsers" />
                            Edit catalog
                          </label>
                          <label className="checkbox-row">
                            <input type="checkbox" name="isHod" />
                            HOD
                          </label>
                        </form>
                      </td>
                      <td>
                        <button
                          form={`approve-${row.id}`}
                          type="submit"
                          className="btn btn-primary btn-sm"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel__header">
            <h2>Approved ({active.length})</h2>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Google accounts</th>
                  <th>Role / permissions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {active.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div className="muted" style={{ fontSize: "0.82rem" }}>
                        {roleLabel(row.role)}
                      </div>
                    </td>
                    <td>
                      {row.googleAccounts.map((g) => (
                        <div
                          key={g.id}
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginBottom: "0.35rem",
                          }}
                        >
                          <span className="sku">{g.email}</span>
                          <form action={removeGoogleAccountAction}>
                            <input type="hidden" name="id" value={g.id} />
                            <button type="submit" className="btn btn-ghost btn-sm">
                              Unlink
                            </button>
                          </form>
                        </div>
                      ))}
                    </td>
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
                            defaultChecked={row.canManageUsers || row.role === "HOD"}
                          />
                          Edit catalog
                        </label>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            name="isHod"
                            defaultChecked={row.role === "HOD"}
                          />
                          HOD
                        </label>
                      </form>
                    </td>
                    <td>
                      <div className="stack-sm">
                        <button form={`user-${row.id}`} type="submit" className="btn btn-ghost btn-sm">
                          Save
                        </button>
                        {row.id !== user!.id ? (
                          <form action={deleteUserAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button type="submit" className="btn btn-danger btn-sm">
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
