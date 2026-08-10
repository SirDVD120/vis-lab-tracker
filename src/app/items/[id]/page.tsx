import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { formatQuantity, kindLabel, needsRestock } from "@/lib/format";
import { ItemForm } from "@/components/ItemForm";
import { StockControls } from "@/components/StockControls";
import { hideItemAction } from "@/actions/items";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, locations, user] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: {
        location: true,
        signOuts: {
          include: { user: true },
          orderBy: { signedOutAt: "desc" },
          take: 10,
        },
        stockAdjustments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    getSession(),
  ]);

  if (!item) notFound();

  const low = needsRestock(item);
  const admin = isAdmin(user);
  const canQuickAdjust = Boolean(user?.canSignOut);
  const showStockPanel = admin || canQuickAdjust;

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">{kindLabel(item.kind)}</p>
        <h1>{item.name}</h1>
        <p className="lede">
          SKU {item.sku}
          {item.barcode && item.barcode !== item.sku ? ` · Barcode ${item.barcode}` : ""}
          {item.location ? ` · ${item.location.name}` : ""}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem", alignItems: "center" }}>
          <span className={`badge ${low ? "badge--restock" : "badge--ok"}`}>
            {low ? "Restock" : "OK"}
          </span>
          {item.hidden ? <span className="badge badge--muted">Hidden</span> : null}
          {item.excludeFromRestock ? (
            <span className="badge badge--muted">No reorder</span>
          ) : null}
          <span className="badge badge--muted">
            In stock: {formatQuantity(item.quantity, item.unit)}
          </span>
          <span className="badge badge--muted">
            Restock below {formatQuantity(item.restockThreshold, item.unit)}
          </span>
          {!item.hidden ? (
            <Link
              href={`/sign-out?q=${encodeURIComponent(item.sku)}`}
              className="btn btn-primary btn-sm"
            >
              Sign out
            </Link>
          ) : null}
        </div>
      </section>

      <div className="detail-grid">
        <div className="stack-sm">
          <div className="panel">
            <div className="panel__header">
              <h2>Details</h2>
              <Link
                href={item.kind === "EQUIPMENT" ? "/equipment" : "/consumables"}
                className="muted"
              >
                Back to list
              </Link>
            </div>
            <div className="panel__body stack-sm">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 12,
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                  }}
                />
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No image on file.
                </p>
              )}

              {item.sdsFilename ? (
                <p style={{ margin: 0 }}>
                  <strong>SDS:</strong>{" "}
                  {item.sdsFilename.startsWith("http") ? (
                    <ExternalLink href={item.sdsFilename}>{item.sdsFilename}</ExternalLink>
                  ) : (
                    item.sdsFilename
                  )}
                </p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No SDS on file.
                </p>
              )}

              {item.purchaseLink ? (
                <p style={{ margin: 0 }}>
                  <strong>Purchase:</strong>{" "}
                  <ExternalLink href={item.purchaseLink}>{item.purchaseLink}</ExternalLink>
                </p>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No purchase link on file.
                </p>
              )}

              {item.notes ? <p style={{ margin: 0 }}>{item.notes}</p> : null}
            </div>
          </div>

          {showStockPanel ? (
            <div className="panel">
              <div className="panel__header">
                <h2>Stock</h2>
              </div>
              <div className="panel__body">
                <StockControls
                  itemId={item.id}
                  quantity={item.quantity}
                  unit={item.unit}
                  canStockTake={admin}
                  canQuickAdjust={canQuickAdjust}
                />
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel__body">
                <p className="muted" style={{ margin: 0 }}>
                  Choose an account to adjust stock when buying or something breaks.
                </p>
                <Link
                  href="/account"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: "0.75rem" }}
                >
                  Choose account
                </Link>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel__header">
              <h2>Recent sign-outs</h2>
            </div>
            {item.signOuts.length === 0 ? (
              <div className="empty">No sign-outs yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Who</th>
                      <th>Taken</th>
                      <th>Returned</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.signOuts.map((row) => (
                      <tr key={row.id}>
                        <td>{format(row.signedOutAt, "dd MMM yyyy HH:mm")}</td>
                        <td>{row.user.name}</td>
                        <td>{formatQuantity(row.amountTaken, item.unit)}</td>
                        <td>{formatQuantity(row.amountReturned, item.unit)}</td>
                        <td>
                          <span
                            className={`badge ${
                              row.status === "RETURNED"
                                ? "badge--ok"
                                : row.status === "PARTIAL"
                                  ? "badge--open"
                                  : "badge--restock"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="stack-sm">
          {admin ? (
            <div className="panel">
              <div className="panel__header">
                <h2>Edit item</h2>
                <form action={hideItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="hidden" value={item.hidden ? "false" : "true"} />
                  <button type="submit" className="btn btn-danger btn-sm">
                    {item.hidden ? "Unhide" : "Hide item"}
                  </button>
                </form>
              </div>
              <div className="panel__body">
                <ItemForm
                  mode="edit"
                  item={item}
                  locations={locations}
                  canManageLocations
                />
              </div>
            </div>
          ) : null}

          <div className="panel">
            <div className="panel__header">
              <h2>Stock history</h2>
            </div>
            {item.stockAdjustments.length === 0 ? (
              <div className="empty">No adjustments yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Change</th>
                      <th>After</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.stockAdjustments.map((row) => (
                      <tr key={row.id}>
                        <td>{format(row.createdAt, "dd MMM HH:mm")}</td>
                        <td className={row.delta < 0 ? "qty--low" : ""}>
                          {row.delta > 0 ? "+" : ""}
                          {formatQuantity(row.delta, item.unit)}
                        </td>
                        <td>{formatQuantity(row.quantityAfter, item.unit)}</td>
                        <td>
                          {row.reason}
                          {row.createdBy ? (
                            <span className="muted"> · {row.createdBy}</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
