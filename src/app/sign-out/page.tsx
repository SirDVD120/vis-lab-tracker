import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatQuantity } from "@/lib/format";
import { ReturnForm, SignOutForm } from "@/components/SignOutForms";

export default async function SignOutPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const user = await getSession();

  const [matches, openSignOuts] = await Promise.all([
    q
      ? prisma.item.findMany({
          where: {
            hidden: false,
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { location: true },
          orderBy: { name: "asc" },
          take: 25,
        })
      : Promise.resolve([]),
    prisma.signOut.findMany({
      where: { status: { in: ["OPEN", "PARTIAL"] } },
      include: {
        item: true,
        user: true,
      },
      orderBy: { signedOutAt: "desc" },
    }),
  ]);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Workflow</p>
        <h1>Sign out</h1>
        <p className="lede">
          Type a SKU or item name, take what you need, then record how much comes
          back. Consumable usage helps spot what to order before lessons.
        </p>
      </section>

      {!user?.canSignOut ? (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <div className="panel__body">
            <p style={{ margin: 0 }}>
              Select an authorised account before signing items out.{" "}
              <Link href="/account">Choose account</Link>
            </p>
          </div>
        </div>
      ) : null}

      <div className="detail-grid">
        <div className="panel">
          <div className="panel__header">
            <h2>Find item by SKU</h2>
          </div>
          <div className="panel__body stack-sm">
            <form className="toolbar" action="/sign-out" method="get">
              <div className="toolbar__grow field">
                <label htmlFor="q" style={{ position: "absolute", left: "-9999px" }}>
                  SKU or name
                </label>
                <input
                  id="q"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="e.g. 10012 or Beaker"
                  autoComplete="off"
                  enterKeyHint="search"
                  inputMode="search"
                />
              </div>
              <div className="toolbar__actions">
                <button type="submit" className="btn btn-ghost">
                  Find
                </button>
              </div>
            </form>

            {user?.canSignOut ? (
              q ? (
                <SignOutForm
                  items={matches.map((item) => ({
                    id: item.id,
                    sku: item.sku,
                    name: item.name,
                    unit: item.unit,
                    quantity: item.quantity,
                    kind: item.kind,
                    locationName: item.location?.name ?? null,
                  }))}
                />
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Enter a SKU to sign something out.
                </p>
              )
            ) : null}
          </div>
        </div>

        <div className="panel">
          <div className="panel__header">
            <h2>Currently out</h2>
            <span className="muted">{openSignOuts.length}</span>
          </div>
          {openSignOuts.length === 0 ? (
            <div className="empty">Nothing outstanding.</div>
          ) : (
            <>
              <div className="signout-cards">
                {openSignOuts.map((row) => {
                  const remaining = row.amountTaken - row.amountReturned;
                  return (
                    <article key={row.id} className="signout-card">
                      <div className="signout-card__row">
                        <div>
                          <Link href={`/items/${row.itemId}`} className="item-link">
                            {row.item.name}
                          </Link>
                          <div className="sku">
                            {row.item.sku} · {row.user.name} ·{" "}
                            {format(row.signedOutAt, "dd MMM HH:mm")}
                          </div>
                        </div>
                        <div className="qty">
                          {formatQuantity(remaining, row.item.unit)}
                        </div>
                      </div>
                      {user?.canSignOut ? (
                        <ReturnForm
                          signOutId={row.id}
                          maxReturn={remaining}
                          unit={row.item.unit}
                          kind={row.item.kind}
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="table-wrap signout-desktop">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Who</th>
                      <th>Out</th>
                      <th>Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openSignOuts.map((row) => {
                      const remaining = row.amountTaken - row.amountReturned;
                      return (
                        <tr key={row.id}>
                          <td>
                            <Link href={`/items/${row.itemId}`} className="item-link">
                              {row.item.name}
                            </Link>
                            <div className="sku">
                              {row.item.sku} · {format(row.signedOutAt, "dd MMM HH:mm")}
                            </div>
                          </td>
                          <td>{row.user.name}</td>
                          <td>
                            {formatQuantity(remaining, row.item.unit)}
                            {row.amountReturned > 0 ? (
                              <div className="muted">
                                of {formatQuantity(row.amountTaken, row.item.unit)}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            {user?.canSignOut ? (
                              <ReturnForm
                                signOutId={row.id}
                                maxReturn={remaining}
                                unit={row.item.unit}
                                kind={row.item.kind}
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
