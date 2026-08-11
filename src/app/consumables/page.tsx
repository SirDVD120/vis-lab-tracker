import { ItemTable } from "@/components/ItemTable";
import { InventorySearch } from "@/components/InventorySearch";
import { CrossCatalogResults } from "@/components/CrossCatalogResults";
import { searchItems } from "@/lib/data";
import { requireApprovedPage, isAdmin } from "@/lib/auth";

export default async function ConsumablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hidden?: string }>;
}) {
  const params = await searchParams;
  const includeHidden = params.hidden === "1";
  const query = params.q?.trim() ?? "";
  const returnTo = query
    ? `/consumables?q=${encodeURIComponent(query)}${includeHidden ? "&hidden=1" : ""}`
    : includeHidden
      ? "/consumables?hidden=1"
      : "/consumables";

  const [user, items, otherItems] = await Promise.all([
    requireApprovedPage(),
    searchItems({
      kind: "CONSUMABLE",
      query: params.q,
      includeHidden,
    }),
    query
      ? searchItems({
          kind: "EQUIPMENT",
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
        <h1>Consumables</h1>
        <p className="lede">
          Chemicals and supplies with per-item units. Use stock take on an item
          page to set the real amount after counting.
        </p>
      </section>

      <InventorySearch
        actionHref="/consumables"
        preferKind="CONSUMABLE"
        defaultQuery={params.q ?? ""}
        showHidden={includeHidden}
        newHref={isAdmin(user) ? "/items/new?kind=CONSUMABLE" : undefined}
        newLabel="Add consumable"
      />

      <div className="stack-sm">
        <div className="panel">
          <div className="panel__header">
            <h2>
              {items.length} item{items.length === 1 ? "" : "s"}
            </h2>
          </div>
          <ItemTable
            items={items}
            emptyLabel="No consumables match that search."
            returnTo={returnTo}
          />
        </div>

        {query ? (
          <CrossCatalogResults
            items={otherItems}
            otherHref="/equipment"
            otherLabel="Equipment"
            query={query}
          />
        ) : null}
      </div>
    </main>
  );
}
