import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, isAdmin } from "@/lib/auth";
import { ItemForm } from "@/components/ItemForm";

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const user = await getSession();
  if (!isAdmin(user)) {
    redirect("/account");
  }

  const kind = params.kind === "CONSUMABLE" ? "CONSUMABLE" : "EQUIPMENT";
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

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
