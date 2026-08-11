import Link from "next/link";
import { format } from "date-fns";
import { homeAttention, inventoryCounts } from "@/lib/data";
import { isStudent, requireApprovedPage } from "@/lib/auth";
import { formatQuantity, kindLabel } from "@/lib/format";
import { HomeSearch } from "@/components/HomeSearch";

export default async function HomePage() {
  const user = await requireApprovedPage();
  const student = isStudent(user);
  const [counts, attention] = await Promise.all([
    inventoryCounts(),
    student ? Promise.resolve(null) : homeAttention(),
  ]);

  const destinations = [
    {
      href: "/equipment",
      eyebrow: "Catalog",
      title: "Equipment",
      count: counts.equipment,
      countLabel: "items",
      blurb: "Glassware, tools, and reusable lab gear.",
      alert: false,
    },
    {
      href: "/consumables",
      eyebrow: "Catalog",
      title: "Consumables",
      count: counts.consumables,
      countLabel: "items",
      blurb: "Chemicals and supplies with SDS details.",
      alert: false,
    },
    ...(student
      ? []
      : [
          {
            href: "/sign-out",
            eyebrow: "Workflow",
            title: "Sign out",
            count: counts.openSignOuts,
            countLabel: "open",
            blurb: "Take items by SKU and record returns.",
            alert: false,
          },
          {
            href: "/restock",
            eyebrow: "Alerts",
            title: "Restock",
            count: counts.restock,
            countLabel: "low",
            blurb: "Stock below the restock threshold.",
            alert: counts.restock > 0,
          },
        ]),
  ];

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">VIS Science</p>
        <h1>Lab inventory at a glance</h1>
        <p className="lede">
          {student
            ? "Browse equipment and consumables for lab club. Ask a teacher if you need something signed out."
            : "Browse equipment and consumables, sign items out by SKU, and spot what needs restocking before the next lesson."}
        </p>
      </section>

      <HomeSearch />

      <div className="home-grid">
        {destinations.map((dest) => (
          <Link
            key={dest.href}
            href={dest.href}
            className={`home-card ${dest.alert ? "home-card--alert" : ""}`}
          >
            <div className="home-card__top">
              <p className="eyebrow">{dest.eyebrow}</p>
              <p className="home-card__count">
                <strong>{dest.count}</strong>
                <span>{dest.countLabel}</span>
              </p>
            </div>
            <h2>{dest.title}</h2>
            <p>{dest.blurb}</p>
          </Link>
        ))}
      </div>

      {student ? (
        <section className="home-section">
          <div className="panel">
            <div className="panel__header">
              <h2>Finding things</h2>
            </div>
            <div className="panel__body stack-sm">
              <p style={{ margin: 0 }}>
                Use <Link href="/equipment"><strong>Equipment</strong></Link> or{" "}
                <Link href="/consumables"><strong>Consumables</strong></Link> and search by
                name or SKU. Open an item to see location, stock, and SDS links.
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Students can browse only — ask a teacher to sign items out.
              </p>
            </div>
          </div>
        </section>
      ) : attention ? (
        <section className="home-section">
          <div className="home-attention">
            <div className="panel">
              <div className="panel__header">
                <h2>Low stock</h2>
                <Link href="/restock" className="btn btn-ghost btn-sm">
                  View all
                </Link>
              </div>
              {attention.lowStock.length === 0 ? (
                <div className="empty">Nothing below threshold right now.</div>
              ) : (
                <ul className="home-list">
                  {attention.lowStock.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/items/${item.id}?from=${encodeURIComponent(
                          item.kind === "EQUIPMENT" ? "/equipment" : "/consumables",
                        )}`}
                        className="home-list__row"
                      >
                        <span className="home-list__main">
                          <strong>{item.name}</strong>
                          <span className="muted">
                            {kindLabel(item.kind)}
                            {item.location ? ` · ${item.location.name}` : ""}
                          </span>
                        </span>
                        <span className="home-list__meta home-list__meta--alert">
                          {formatQuantity(item.quantity, item.unit)}
                          <em> / {formatQuantity(item.restockThreshold, item.unit)}</em>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel">
              <div className="panel__header">
                <h2>Open sign-outs</h2>
                <Link href="/sign-out" className="btn btn-ghost btn-sm">
                  View all
                </Link>
              </div>
              {attention.openSignOuts.length === 0 ? (
                <div className="empty">No open sign-outs.</div>
              ) : (
                <ul className="home-list">
                  {attention.openSignOuts.map((row) => (
                    <li key={row.id}>
                      <Link href="/sign-out" className="home-list__row">
                        <span className="home-list__main">
                          <strong>{row.item.name}</strong>
                          <span className="muted">
                            {row.user.name} · {format(row.signedOutAt, "dd MMM")}
                          </span>
                        </span>
                        <span className="home-list__meta">
                          {formatQuantity(row.amountTaken - row.amountReturned, row.item.unit)} out
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
