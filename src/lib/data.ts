import { prisma } from "@/lib/prisma";
import type { ItemKind, Prisma } from "@/generated/prisma/client";

export async function searchItems(options: {
  kind: ItemKind;
  query?: string;
  includeHidden?: boolean;
  restockOnly?: boolean;
  take?: number;
}) {
  const q = options.query?.trim();

  const where: Prisma.ItemWhereInput = {
    kind: options.kind,
    ...(options.includeHidden ? {} : { hidden: false }),
  };

  if (options.restockOnly) {
    where.excludeFromRestock = false;
  }

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
    ...(options.take ? { take: options.take } : {}),
  });

  if (!options.restockOnly) return items;

  return items.filter((item) => item.quantity < item.restockThreshold);
}

export type SuggestItem = {
  id: string;
  name: string;
  sku: string;
  kind: ItemKind;
  locationName: string | null;
};

/** Compact matches for typeahead (both catalogs). */
export async function suggestItems(query: string, options?: {
  preferKind?: ItemKind;
  limit?: number;
}): Promise<SuggestItem[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const limit = options?.limit ?? 10;
  const items = await prisma.item.findMany({
    where: {
      hidden: false,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { barcode: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      kind: true,
      location: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }],
    take: limit * 2,
  });

  const mapped = items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    kind: item.kind,
    locationName: item.location?.name ?? null,
  }));

  if (!options?.preferKind) return mapped.slice(0, limit);

  return [
    ...mapped.filter((i) => i.kind === options.preferKind),
    ...mapped.filter((i) => i.kind !== options.preferKind),
  ].slice(0, limit);
}

export async function inventoryCounts() {
  const [equipment, consumables, restockRow, openSignOuts] = await Promise.all([
    prisma.item.count({ where: { kind: "EQUIPMENT", hidden: false } }),
    prisma.item.count({ where: { kind: "CONSUMABLE", hidden: false } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Item"
      WHERE hidden = false
        AND "excludeFromRestock" = false
        AND quantity < "restockThreshold"
    `,
    prisma.signOut.count({ where: { status: { in: ["OPEN", "PARTIAL"] } } }),
  ]);

  return {
    equipment,
    consumables,
    restock: Number(restockRow[0]?.count ?? 0),
    openSignOuts,
  };
}

/** Compact lists for the home “needs attention” section */
export async function homeAttention() {
  const [lowStock, openSignOuts] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        kind: ItemKind;
        name: string;
        unit: string;
        quantity: number;
        restockThreshold: number;
        locationId: string | null;
        locationName: string | null;
      }>
    >`
      SELECT i.id, i.kind, i.name, i.unit, i.quantity, i."restockThreshold",
             i."locationId", l.name AS "locationName"
      FROM "Item" i
      LEFT JOIN "Location" l ON l.id = i."locationId"
      WHERE i.hidden = false
        AND i."excludeFromRestock" = false
        AND i.quantity < i."restockThreshold"
      ORDER BY i.kind ASC, i.name ASC
      LIMIT 6
    `,
    prisma.signOut.findMany({
      where: { status: { in: ["OPEN", "PARTIAL"] } },
      include: {
        item: { select: { id: true, name: true, unit: true } },
        user: { select: { name: true } },
      },
      orderBy: { signedOutAt: "desc" },
      take: 6,
    }),
  ]);

  return {
    lowStock: lowStock.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      unit: item.unit,
      quantity: Number(item.quantity),
      restockThreshold: Number(item.restockThreshold),
      location: item.locationId
        ? { id: item.locationId, name: item.locationName ?? "" }
        : null,
    })),
    openSignOuts,
  };
}
