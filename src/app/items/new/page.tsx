import { redirect } from "next/navigation";
import { requireApprovedPage, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/ItemForm";
import { sortByNameNatural } from "@/lib/format";
import Link from "next/link";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const user = await requireApprovedPage();
  if (!isAdmin(user)) {
    redirect("/");
  }

  const kind = params.kind === "CONSUMABLE" ? "CONSUMABLE" : "EQUIPMENT";
  const locations = sortByNameNatural(
    await prisma.location.findMany({ orderBy: { name: "asc" } }),
  );

  return (
    <main>
      <section className="page-hero">
        <p className="eyebrow">Add item</p>
        <h1>{kind === "EQUIPMENT" ? "New equipment" : "New consumable"}</h1>
        <p className="lede">
          Create a catalog entry after a purchase or when adding something new to the stockroom.
        </p>
      </section>

      <div className="panel">
        <div className="panel__header">
          <h2>Item details</h2>
          <Link href={kind === "EQUIPMENT" ? "/equipment" : "/consumables"} className="muted">
            Cancel
          </Link>
        </div>
        <div className="panel__body">
          <ItemForm
            mode="create"
            locations={locations}
            defaultKind={kind}
            canManageLocations
          />
        </div>
      </div>
    </main>
  );
}
