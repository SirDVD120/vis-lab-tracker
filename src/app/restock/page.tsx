import Link from "next/link";
import { ItemTable } from "@/components/ItemTable";
import { prisma } from "@/lib/prisma";
import { needsRestock } from "@/lib/format";
import { requireApprovedPage } from "@/lib/auth";

export default async function RestockPage() {
  await requireApprovedPage();
  const items = await prisma.item.findMany({
    where: {
      hidden: false,
      excludeFromRestock: false,
    },
    include: { location: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });

  const needing = items.filter(needsRestock);
  const equipment = needing.filter((i) => i.kind === "EQUIPMENT");
  const consumables = needing.filter((i) => i.kind === "CONSUMABLE");

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Alerts</p>
        <h1>Restock list</h1>
        <p className="lede">
          Items where stock is below the restock threshold. Mark discontinued
          items with &ldquo;No reorder&rdquo; on the item page to keep them off this list.
        </p>
      </section>

      <div className="stats-row">
        <div className={`stat ${needing.length ? "stat--alert" : ""}`}>
          <p className="stat__label">Total alerts</p>
          <p className="stat__value">{needing.length}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Equipment</p>
          <p className="stat__value">{equipment.length}</p>
        </div>
        <div className="stat">
          <p className="stat__label">Consumables</p>
          <p className="stat__value">{consumables.length}</p>
        </div>
      </div>

      <div className="stack-sm">
        <div className="panel">
          <div className="panel__header">
            <h2>Equipment needing restock</h2>
            <Link href="/equipment" className="muted">
              Browse all
            </Link>
          </div>
          <ItemTable items={equipment} emptyLabel="No equipment below threshold." />
        </div>
        <div className="panel">
          <div className="panel__header">
            <h2>Consumables needing restock</h2>
            <Link href="/consumables" className="muted">
              Browse all
            </Link>
          </div>
          <ItemTable items={consumables} emptyLabel="No consumables below threshold." />
        </div>
      </div>
    </main>
  );
}
