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
  return "Staff";
}
