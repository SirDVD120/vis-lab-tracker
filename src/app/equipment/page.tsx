import { ItemTable } from "@/components/ItemTable";
import { InventorySearch } from "@/components/InventorySearch";
import { CrossCatalogResults } from "@/components/CrossCatalogResults";
import { searchItems } from "@/lib/data";
import { requireApprovedPage, isAdmin } from "@/lib/auth";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hidden?: string }>;
}) {
  const params = await searchParams;
  const includeHidden = params.hidden === "1";
  const query = params.q?.trim() ?? "";

  const [user, items, otherItems] = await Promise.all([
    requireApprovedPage(),
    searchItems({
      kind: "EQUIPMENT",
      query: params.q,
      includeHidden,
    }),
    query
      ? searchItems({
          kind: "CONSUMABLE",
          query,
          includeHidden: false,
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Catalog</p>
        <h1>Equipment</h1>
        <p className="lede">
          Reusable lab equipment. Low stock is highlighted in red. Hide items you
          no longer want to order without deleting their history.
        </p>
      </section>

      <InventorySearch
        actionHref="/equipment"
        preferKind="EQUIPMENT"
        defaultQuery={params.q ?? ""}
        showHidden={includeHidden}
        newHref={isAdmin(user) ? "/items/new?kind=EQUIPMENT" : undefined}
        newLabel="Add equipment"
      />

      <div className="stack-sm">
        <div className="panel">
          <div className="panel__header">
            <h2>
              {items.length} item{items.length === 1 ? "" : "s"}
            </h2>
          </div>
          <ItemTable items={items} emptyLabel="No equipment matches that search." />
        </div>

        {query ? (
          <CrossCatalogResults
            items={otherItems}
            otherHref="/consumables"
            otherLabel="Consumables"
            query={query}
          />
        ) : null}
      </div>
    </main>
  );
}
