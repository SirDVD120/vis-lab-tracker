"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Item, Location } from "@/generated/prisma/client";
import { formatQuantity, needsRestock } from "@/lib/format";

type ItemRow = Item & { location: Location | null };

function itemHref(itemId: string, returnTo?: string) {
  if (!returnTo) return `/items/${itemId}`;
  return `/items/${itemId}?from=${encodeURIComponent(returnTo)}`;
}

export function ItemTable({
  items,
  emptyLabel = "No items found.",
  showSignOut = true,
  returnTo,
}: {
  items: ItemRow[];
  emptyLabel?: string;
  showSignOut?: boolean;
  /** Catalog path to return to from the item page (e.g. /equipment?q=beaker) */
  returnTo?: string;
}) {
  if (items.length === 0) {
    return <div className="empty">{emptyLabel}</div>;
  }

  return (
    <>
      <div className="item-cards">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            showSignOut={showSignOut}
            returnTo={returnTo}
          />
        ))}
      </div>

      <div className="table-wrap table-wrap--desktop">
        <table className="data-table data-table--rows">
          <thead>
            <tr>
              {showSignOut ? <th className="col-action">Sign out</th> : null}
              <th>SKU</th>
              <th>Item</th>
              <th>Location</th>
              <th>In stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ItemTableRow
                key={item.id}
                item={item}
                showSignOut={showSignOut}
                returnTo={returnTo}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ItemBadges({ item, low }: { item: ItemRow; low: boolean }) {
  return (
    <>
      {item.hidden ? <span className="badge badge--muted">Hidden</span> : null}
      {item.excludeFromRestock ? <span className="badge badge--muted">No reorder</span> : null}
      {low ? (
        <span className="badge badge--restock">Restock</span>
      ) : (
        <span className="badge badge--ok">OK</span>
      )}
    </>
  );
}

function ItemCard({
  item,
  showSignOut,
  returnTo,
}: {
  item: ItemRow;
  showSignOut: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const low = needsRestock(item);
  const href = itemHref(item.id, returnTo);

  return (
    <article
      className={`item-card ${low ? "is-restock" : ""}`}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      tabIndex={0}
      role="link"
    >
      <div className="item-card__main">
        <div className="item-card__title">
          <span className="item-link">{item.name}</span>
          <span className="sku">{item.sku}</span>
        </div>
        <p className="item-card__meta">
          {item.location?.name ?? "No location"} ·{" "}
          <span className={`qty ${low ? "qty--low" : ""}`}>
            {formatQuantity(item.quantity, item.unit)}
          </span>
        </p>
        <div className="item-card__badges">
          <ItemBadges item={item} low={low} />
        </div>
      </div>
      {showSignOut ? (
        <Link
          href={`/sign-out?q=${encodeURIComponent(item.sku)}`}
          className="btn btn-ghost btn-sm"
          onClick={(event) => event.stopPropagation()}
        >
          Sign out
        </Link>
      ) : null}
    </article>
  );
}

function ItemTableRow({
  item,
  showSignOut,
  returnTo,
}: {
  item: ItemRow;
  showSignOut: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const low = needsRestock(item);
  const href = itemHref(item.id, returnTo);

  return (
    <tr
      className={`is-clickable ${low ? "is-restock" : ""}`}
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
    >
      {showSignOut ? (
        <td className="col-action">
          <Link
            href={`/sign-out?q=${encodeURIComponent(item.sku)}`}
            className="btn btn-ghost btn-sm"
            onClick={(event) => event.stopPropagation()}
          >
            Sign out
          </Link>
        </td>
      ) : null}
      <td className="sku">{item.sku}</td>
      <td>
        <span className="item-link">{item.name}</span>
        {item.hidden ? (
          <span className="badge badge--muted" style={{ marginLeft: "0.5rem" }}>
            Hidden
          </span>
        ) : null}
        {item.excludeFromRestock ? (
          <span className="badge badge--muted" style={{ marginLeft: "0.5rem" }}>
            No reorder
          </span>
        ) : null}
      </td>
      <td>{item.location?.name ?? "—"}</td>
      <td className={`qty ${low ? "qty--low" : ""}`}>
        {formatQuantity(item.quantity, item.unit)}
      </td>
      <td>
        {low ? (
          <span className="badge badge--restock">Restock</span>
        ) : (
          <span className="badge badge--ok">OK</span>
        )}
      </td>
    </tr>
  );
}
