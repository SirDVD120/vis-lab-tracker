import { prisma } from "@/lib/prisma";
import type { ItemKind, Prisma } from "@/generated/prisma/client";

export async function searchItems(options: {
  kind: ItemKind;
  query?: string;
  includeHidden?: boolean;
  restockOnly?: boolean;
}) {
  const q = options.query?.trim();

  const where: Prisma.ItemWhereInput = {
    kind: options.kind,
    ...(options.includeHidden ? {} : { hidden: false }),
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    include: { location: true },
    orderBy: [{ name: "asc" }],
  });

  if (!options.restockOnly) return items;

  return items.filter(
    (item) =>
      !item.excludeFromRestock &&
      !item.hidden &&
      item.quantity < item.restockThreshold,
  );
}

export async function inventoryCounts() {
  const [equipment, consumables, restockEquipment, restockConsumables, openSignOuts] =
    await Promise.all([
      prisma.item.count({ where: { kind: "EQUIPMENT", hidden: false } }),
      prisma.item.count({ where: { kind: "CONSUMABLE", hidden: false } }),
      prisma.item.findMany({
        where: {
          kind: "EQUIPMENT",
          hidden: false,
          excludeFromRestock: false,
        },
        select: { quantity: true, restockThreshold: true },
      }),
      prisma.item.findMany({
        where: {
          kind: "CONSUMABLE",
          hidden: false,
          excludeFromRestock: false,
        },
        select: { quantity: true, restockThreshold: true },
      }),
      prisma.signOut.count({ where: { status: { in: ["OPEN", "PARTIAL"] } } }),
    ]);

  return {
    equipment,
    consumables,
    restock:
      restockEquipment.filter((i) => i.quantity < i.restockThreshold).length +
      restockConsumables.filter((i) => i.quantity < i.restockThreshold).length,
    openSignOuts,
  };
}

/** Compact lists for the home “needs attention” section */
export async function homeAttention() {
  const [restockCandidates, openSignOuts] = await Promise.all([
    prisma.item.findMany({
      where: {
        hidden: false,
        excludeFromRestock: false,
      },
      include: { location: true },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      take: 80,
    }),
    prisma.signOut.findMany({
      where: { status: { in: ["OPEN", "PARTIAL"] } },
      include: {
        item: true,
        user: { select: { name: true } },
      },
      orderBy: { signedOutAt: "desc" },
      take: 6,
    }),
  ]);

  const lowStock = restockCandidates
    .filter((item) => item.quantity < item.restockThreshold)
    .slice(0, 6);

  return { lowStock, openSignOuts };
}
