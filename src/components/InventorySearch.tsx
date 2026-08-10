import Link from "next/link";

export function InventorySearch({
  placeholder = "Search by name or SKU…",
  defaultQuery = "",
  showHidden = false,
  actionHref,
  newHref,
  newLabel,
}: {
  placeholder?: string;
  defaultQuery?: string;
  showHidden?: boolean;
  actionHref: string;
  newHref?: string;
  newLabel?: string;
}) {
  return (
    <form className="toolbar" action={actionHref} method="get">
      <div className="toolbar__grow field">
        <label htmlFor="q" className="sr-only" style={{ position: "absolute", left: "-9999px" }}>
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>
      <div className="toolbar__actions">
        <label className="checkbox-row" style={{ marginTop: 0 }}>
          <input type="checkbox" name="hidden" value="1" defaultChecked={showHidden} />
          Show hidden
        </label>
        <button type="submit" className="btn btn-ghost">
          Search
        </button>
        {newHref ? (
          <Link href={newHref} className="btn btn-primary">
            {newLabel ?? "Add item"}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
