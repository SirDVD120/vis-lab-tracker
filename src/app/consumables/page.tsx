import { ItemTable } from "@/components/ItemTable";
import { InventorySearch } from "@/components/InventorySearch";
import { searchItems } from "@/lib/data";
import { requireApprovedPage, getSession, isAdmin } from "@/lib/auth";

export default async function ConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hidden?: string }>;
}) {
  const params = await searchParams;
  const includeHidden = params.hidden === "1";
  await requireApprovedPage();
  const [items, user] = await Promise.all([
    searchItems({
      kind: "CONSUMABLE",
      query: params.q,
      includeHidden,
    }),
    getSession(),
  ]);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Catalog</p>
        <h1>Consumables</h1>
        <p className="lede">
          Chemicals and supplies with per-item units. Use stock take on an item
          page to set the real amount after counting.
        </p>
      </section>

      <InventorySearch
        actionHref="/consumables"
        defaultQuery={params.q ?? ""}
        showHidden={includeHidden}
        newHref={isAdmin(user) ? "/items/new?kind=CONSUMABLE" : undefined}
        newLabel="Add consumable"
      />

      <div className="panel">
        <div className="panel__header">
          <h2>
            {items.length} item{items.length === 1 ? "" : "s"}
          </h2>
        </div>
        <ItemTable items={items} emptyLabel="No consumables match that search." />
      </div>
    </main>
  );
}
