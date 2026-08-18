"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  requireSession,
  requireSignOutPermission,
} from "@/lib/auth";
import type { ItemKind } from "@/generated/prisma/client";

const itemSchema = z.object({
  kind: z.enum(["EQUIPMENT", "CONSUMABLE"]),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  quantity: z.coerce.number().min(0),
  restockThreshold: z.coerce.number().min(0),
  notes: z.string().optional(),
  sdsFilename: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  purchaseLink: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  excludeFromRestock: z.coerce.boolean().optional(),
  hidden: z.coerce.boolean().optional(),
});

/** Next internal SKU: equipment 1xxxx, consumables 2xxxx */
export async function nextSkuForKind(kind: ItemKind): Promise<string> {
  const prefix = kind === "EQUIPMENT" ? "1" : "2";
  const floor = kind === "EQUIPMENT" ? 10000 : 20000;
  const rows = await prisma.item.findMany({
    where: { sku: { startsWith: prefix } },
    select: { sku: true },
  });

  let max = floor;
  for (const { sku } of rows) {
    if (!/^\d+$/.test(sku) || !sku.startsWith(prefix)) continue;
    const n = Number(sku);
    if (Number.isSafeInteger(n) && n > max) max = n;
  }

  return String(max + 1);
}

function revalidateInventory(kind?: ItemKind) {
  revalidatePath("/");
  revalidatePath("/restock");
  revalidatePath("/sign-out");
  if (!kind || kind === "EQUIPMENT") revalidatePath("/equipment");
  if (!kind || kind === "CONSUMABLE") revalidatePath("/consumables");
}

function parseItemForm(formData: FormData, existingSku?: string) {
  return itemSchema.parse({
    kind: formData.get("kind"),
    sku: existingSku ?? (formData.get("sku") || undefined),
    barcode: formData.get("barcode") || undefined,
    name: formData.get("name"),
    unit: formData.get("unit"),
    quantity: formData.get("quantity"),
    restockThreshold: formData.get("restockThreshold"),
    notes: formData.get("notes") || "",
    sdsFilename: formData.get("sdsFilename") || null,
    imageUrl: formData.get("imageUrl") || null,
    purchaseLink: formData.get("purchaseLink") || null,
    locationId: formData.get("locationId") || null,
    excludeFromRestock: formData.get("excludeFromRestock") === "on",
    hidden: formData.get("hidden") === "on",
  });
}

export async function createItemAction(formData: FormData) {
  await requireAdmin();

  const parsed = parseItemForm(formData);
  let sku = parsed.sku?.trim() || "";
  if (!sku) {
    sku = await nextSkuForKind(parsed.kind);
  }

  const existing = await prisma.item.findUnique({ where: { sku } });
  if (existing) {
    throw new Error(`SKU ${sku} is already in use`);
  }

  // Product barcode (EAN etc.) if provided; otherwise match the lab SKU
  const barcode = parsed.barcode?.trim() || sku;

  const item = await prisma.item.create({
    data: {
      kind: parsed.kind,
      sku,
      barcode,
      name: parsed.name,
      unit: parsed.unit,
      quantity: parsed.quantity,
      restockThreshold: parsed.restockThreshold,
      notes: parsed.notes ?? "",
      sdsFilename: parsed.sdsFilename || null,
      imageUrl: parsed.imageUrl || null,
      purchaseLink: parsed.purchaseLink || null,
      locationId: parsed.locationId || null,
      excludeFromRestock: parsed.excludeFromRestock ?? false,
      hidden: parsed.hidden ?? false,
    },
  });

  await prisma.stockAdjustment.create({
    data: {
      itemId: item.id,
      delta: parsed.quantity,
      reason: "Initial stock",
      quantityAfter: parsed.quantity,
      createdBy: (await requireSession()).name,
    },
  });

  revalidateInventory(parsed.kind);
  return item.id;
}

export async function updateItemAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing item id");

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) throw new Error("Item not found");

  const parsed = parseItemForm(formData, existing.sku);

  await prisma.item.update({
    where: { id },
    data: {
      name: parsed.name,
      unit: parsed.unit,
      restockThreshold: parsed.restockThreshold,
      notes: parsed.notes ?? "",
      sdsFilename: parsed.sdsFilename || null,
      imageUrl: parsed.imageUrl || null,
      purchaseLink: parsed.purchaseLink || null,
      locationId: parsed.locationId || null,
      excludeFromRestock: parsed.excludeFromRestock ?? false,
      hidden: parsed.hidden ?? false,
      barcode: parsed.barcode?.trim() || existing.sku,
    },
  });

  revalidatePath(`/items/${id}`);
  revalidateInventory(existing.kind);
}

export async function setStockAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity"));
  const reason = String(formData.get("reason") ?? "Stock take").trim() || "Stock take";

  if (!id || Number.isNaN(quantity) || quantity < 0) {
    throw new Error("Invalid stock update");
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new Error("Item not found");

  const delta = quantity - item.quantity;
  await prisma.$transaction([
    prisma.item.update({
      where: { id },
      data: { quantity },
    }),
    prisma.stockAdjustment.create({
      data: {
        itemId: id,
        delta,
        reason,
        quantityAfter: quantity,
        createdBy: user.name,
      },
    }),
  ]);

  revalidatePath(`/items/${id}`);
  revalidateInventory(item.kind);
}

export async function adjustStockAction(formData: FormData) {
  const user = await requireSignOutPermission();
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta"));
  const reason = String(formData.get("reason") ?? "").trim();

  if (!id || Number.isNaN(delta) || !reason) {
    throw new Error("Invalid adjustment");
  }

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new Error("Item not found");

  const quantity = Math.max(0, item.quantity + delta);
  await prisma.$transaction([
    prisma.item.update({
      where: { id },
      data: { quantity },
    }),
    prisma.stockAdjustment.create({
      data: {
        itemId: id,
        delta: quantity - item.quantity,
        reason,
        quantityAfter: quantity,
        createdBy: user.name,
      },
    }),
  ]);

  revalidatePath(`/items/${id}`);
  revalidateInventory(item.kind);
}

export async function hideItemAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const hidden = formData.get("hidden") === "true";
  const item = await prisma.item.update({
    where: { id },
    data: { hidden },
  });
  revalidatePath(`/items/${id}`);
  revalidateInventory(item.kind);
}

export async function createLocationAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Location name required");
  await prisma.location.create({ data: { name } });
  revalidatePath("/", "layout");
  revalidatePath("/equipment");
  revalidatePath("/consumables");
  revalidatePath("/items/new");
}
