import Link from "next/link";
import type { Item, Location } from "@/generated/prisma/client";
import { formatQuantity, kindLabel, needsRestock } from "@/lib/format";

type ItemRow = Item & { location: Location | null };

export function CrossCatalogResults({
  items,
  otherHref,
  otherLabel,
  query,
}: {
  items: ItemRow[];
  otherHref: string;
  otherLabel: string;
  query: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="panel panel--cross">
      <div className="panel__header">
        <h2>
          Also in {otherLabel} ({items.length})
        </h2>
        <Link
          href={`${otherHref}?q=${encodeURIComponent(query)}`}
          className="btn btn-ghost btn-sm"
        >
          Open {otherLabel}
        </Link>
      </div>
      <ul className="cross-list">
        {items.map((item) => {
          const low = needsRestock(item);
          return (
            <li key={item.id}>
              <Link
                href={`${otherHref}?q=${encodeURIComponent(item.name)}`}
                className="cross-list__row"
              >
                <span className="cross-list__main">
                  <strong>{item.name}</strong>
                  <span className="muted">
                    {item.sku}
                    {item.location ? ` · ${item.location.name}` : ""}
                  </span>
                </span>
                <span className="cross-list__meta">
                  <span className="badge badge--other">{kindLabel(item.kind)}</span>
                  <span className={`qty ${low ? "qty--low" : ""}`}>
                    {formatQuantity(item.quantity, item.unit)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
