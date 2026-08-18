import type { Item, ItemKind } from "@/generated/prisma/client";

export function needsRestock(item: Pick<Item, "quantity" | "restockThreshold" | "excludeFromRestock" | "hidden">) {
  if (item.hidden || item.excludeFromRestock) return false;
  return item.quantity < item.restockThreshold;
}

export function formatQuantity(quantity: number, unit: string) {
  const rounded =
    Number.isInteger(quantity) || Math.abs(quantity - Math.round(quantity)) < 1e-9
      ? String(Math.round(quantity))
      : quantity.toFixed(1).replace(/\.0$/, "");

  if (unit === "count") return rounded;
  return `${rounded} ${unit}`;
}

export function kindLabel(kind: ItemKind) {
  return kind === "EQUIPMENT" ? "Equipment" : "Consumable";
}

export function roleLabel(role: string) {
  if (role === "HOD") return "Head of Department";
  if (role === "STUDENT") return "Lab club student";
  return "Staff";
}

/** Shelf 1, Shelf 2, … Shelf 10 (not Shelf 1, Shelf 10, Shelf 2). */
export function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortByNameNatural<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => naturalCompare(a.name, b.name));
}
