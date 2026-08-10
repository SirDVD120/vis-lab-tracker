import { redirect } from "next/navigation";
import { format } from "date-fns";
import { isHod, listUsers, requireApprovedPage } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import {
  approveGoogleAccountAction,
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
  const pendingUsers = users.filter(
    (u) => u.status === "PENDING" && u.googleAccounts.length > 0,
  );
  const pendingLinks = users.flatMap((u) =>
    u.status === "APPROVED"
      ? u.googleAccounts
          .filter((g) => g.status === "PENDING")
          .map((g) => ({ account: g, user: u }))
      : [],
  );
  const active = users.filter(
    (u) => u.status === "APPROVED" && u.googleAccounts.some((g) => g.status === "APPROVED"),
  );

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">HOD</p>
        <h1>User access</h1>
        <p className="lede">
          Approve new people and extra Google logins, set staff / student / HOD roles,
          and remove accounts when people leave. Students can browse only.
        </p>
      </section>

      <div className="stack-sm">
        <div className="panel">
          <div className="panel__header">
            <h2>Pending approval ({pendingUsers.length})</h2>
          </div>
          {pendingUsers.length === 0 ? (
            <div className="empty">No pending requests.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Google</th>
                    <th>Role / permissions</th>
                    <th>Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          Requested {format(row.createdAt, "dd MMM yyyy")} · asked for{" "}
                          {roleLabel(row.role)}
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
                          <label className="field" style={{ marginBottom: "0.5rem" }}>
                            <span>Role</span>
                            <select name="role" defaultValue={row.role === "STUDENT" ? "STUDENT" : "STAFF"}>
                              <option value="STAFF">Staff</option>
                              <option value="STUDENT">Lab club student</option>
                              <option value="HOD">HOD</option>
                            </select>
                          </label>
                          <label className="checkbox-row">
                            <input type="checkbox" name="canSignOut" defaultChecked={row.role !== "STUDENT"} />
                            Can sign out
                          </label>
                          <label className="checkbox-row">
                            <input type="checkbox" name="canManageUsers" />
                            Edit catalog
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
            <h2>Pending Google links ({pendingLinks.length})</h2>
          </div>
          {pendingLinks.length === 0 ? (
            <div className="empty">No extra Google accounts waiting.</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>New Google email</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLinks.map(({ account, user: owner }) => (
                    <tr key={account.id}>
                      <td>
                        <strong>{owner.name}</strong>
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          {roleLabel(owner.role)}
                        </div>
                      </td>
                      <td>
                        <span className="sku">{account.email}</span>
                        <div className="muted" style={{ fontSize: "0.82rem" }}>
                          Requested {format(account.createdAt, "dd MMM yyyy")}
                        </div>
                      </td>
                      <td>
                        <div className="stack-sm" style={{ alignItems: "flex-start" }}>
                          <form action={approveGoogleAccountAction}>
                            <input type="hidden" name="id" value={account.id} />
                            <button type="submit" className="btn btn-primary btn-sm">
                              Approve link
                            </button>
                          </form>
                          <form action={removeGoogleAccountAction}>
                            <input type="hidden" name="id" value={account.id} />
                            <button type="submit" className="btn btn-ghost btn-sm">
                              Reject
                            </button>
                          </form>
                        </div>
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
                            flexWrap: "wrap",
                          }}
                        >
                          <span className="sku">{g.email}</span>
                          {g.status === "PENDING" ? (
                            <em className="muted" style={{ fontSize: "0.8rem" }}>
                              pending
                            </em>
                          ) : null}
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
                        <label className="field" style={{ marginBottom: "0.5rem" }}>
                          <span>Role</span>
                          <select name="role" defaultValue={row.role}>
                            <option value="STAFF">Staff</option>
                            <option value="STUDENT">Lab club student</option>
                            <option value="HOD">HOD</option>
                          </select>
                        </label>
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
                      </form>
                    </td>
                    <td>
                      <div className="stack-sm">
                        <button form={`user-${row.id}`} type="submit" className="btn btn-ghost btn-sm">
                          Save
                        </button>
                        {row.id !== user.id ? (
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
