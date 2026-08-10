"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSignOutPermission } from "@/lib/auth";

export async function signOutItemAction(formData: FormData) {
  const user = await requireSignOutPermission();
  const itemId = String(formData.get("itemId") ?? "");
  const amountTaken = Number(formData.get("amountTaken"));
  const notes = String(formData.get("notes") ?? "").trim();

  if (!itemId || Number.isNaN(amountTaken) || amountTaken <= 0) {
    throw new Error("Enter a valid amount to sign out");
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || item.hidden) throw new Error("Item not found");
  if (amountTaken > item.quantity) {
    throw new Error(`Only ${item.quantity} ${item.unit} available`);
  }

  await prisma.$transaction([
    prisma.item.update({
      where: { id: itemId },
      data: { quantity: item.quantity - amountTaken },
    }),
    prisma.signOut.create({
      data: {
        itemId,
        userId: user.id,
        amountTaken,
        notes,
        status: "OPEN",
      },
    }),
    prisma.stockAdjustment.create({
      data: {
        itemId,
        delta: -amountTaken,
        reason: `Signed out by ${user.name}`,
        quantityAfter: item.quantity - amountTaken,
        createdBy: user.name,
      },
    }),
  ]);

  revalidatePath("/sign-out");
  revalidatePath("/");
  revalidatePath("/equipment");
  revalidatePath("/consumables");
  revalidatePath("/restock");
  revalidatePath(`/items/${itemId}`);
}

export async function returnItemAction(formData: FormData) {
  const user = await requireSignOutPermission();
  const signOutId = String(formData.get("signOutId") ?? "");
  const amountReturned = Number(formData.get("amountReturned"));

  if (!signOutId || Number.isNaN(amountReturned) || amountReturned < 0) {
    throw new Error("Enter a valid return amount");
  }

  const record = await prisma.signOut.findUnique({
    where: { id: signOutId },
    include: { item: true },
  });
  if (!record || record.status === "RETURNED") {
    throw new Error("Sign-out record not found");
  }

  const remaining = record.amountTaken - record.amountReturned;
  if (amountReturned > remaining) {
    throw new Error(`At most ${remaining} can be returned`);
  }

  const isConsumable = record.item.kind === "CONSUMABLE";
  const newReturned = record.amountReturned + amountReturned;
  const used = remaining - amountReturned;
  // Consumables: any leftover after return is used up — close the sign-out.
  // Equipment: stay open until everything is returned.
  const fullyClosed = isConsumable || newReturned >= record.amountTaken;
  const newQty = record.item.quantity + amountReturned;

  const adjustments = [];
  if (amountReturned > 0) {
    adjustments.push(
      prisma.stockAdjustment.create({
        data: {
          itemId: record.itemId,
          delta: amountReturned,
          reason: `Returned by ${user.name}`,
          quantityAfter: newQty,
          createdBy: user.name,
        },
      }),
    );
  }
  if (isConsumable && used > 0) {
    adjustments.push(
      prisma.stockAdjustment.create({
        data: {
          itemId: record.itemId,
          delta: 0,
          reason: `Used ${used} ${record.item.unit} (not returned) · ${user.name}`,
          quantityAfter: newQty,
          createdBy: user.name,
        },
      }),
    );
  }

  await prisma.$transaction([
    prisma.signOut.update({
      where: { id: signOutId },
      data: {
        amountReturned: newReturned,
        status: fullyClosed ? "RETURNED" : "PARTIAL",
        returnedAt: fullyClosed ? new Date() : record.returnedAt,
        notes:
          isConsumable && used > 0
            ? [record.notes, `Used ${used} ${record.item.unit}`].filter(Boolean).join(" · ")
            : record.notes,
      },
    }),
    prisma.item.update({
      where: { id: record.itemId },
      data: { quantity: newQty },
    }),
    ...adjustments,
  ]);

  revalidatePath("/sign-out");
  revalidatePath("/");
  revalidatePath("/equipment");
  revalidatePath("/consumables");
  revalidatePath("/restock");
  revalidatePath(`/items/${record.itemId}`);
}
