"use server";

import { revalidatePath } from "next/cache";
import { destroySession, switchToUser } from "@/lib/auth";

export async function switchAccountAction(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) {
    throw new Error("Missing user");
  }
  const session = await switchToUser(userId);
  if (!session) {
    throw new Error("User not found");
  }
  revalidatePath("/", "layout");
}

export async function clearAccountAction() {
  await destroySession();
  revalidatePath("/", "layout");
}
