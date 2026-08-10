"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getAuthState,
  isBootstrapHodEmail,
  requireHod,
} from "@/lib/auth";

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/auth/continue" });
}

export async function googleSignOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function claimNameAction(formData: FormData) {
  const state = await getAuthState();
  if (state.status !== "unclaimed") {
    redirect("/auth/continue");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    throw new Error("Enter your name (at least 2 characters)");
  }

  const existingLink = await prisma.googleAccount.findUnique({
    where: { googleSub: state.google.sub },
  });
  if (existingLink) {
    redirect("/auth/continue");
  }

  const bootstrap = isBootstrapHodEmail(state.google.email);

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { name } });
    if (existing) {
      await tx.googleAccount.create({
        data: {
          googleSub: state.google.sub,
          email: state.google.email,
          userId: existing.id,
        },
      });
      if (bootstrap && existing.role !== "HOD") {
        return tx.user.update({
          where: { id: existing.id },
          data: {
            role: "HOD",
            status: "APPROVED",
            canSignOut: true,
            canManageUsers: true,
          },
        });
      }
      return existing;
    }

    return tx.user.create({
      data: {
        name,
        status: bootstrap ? "APPROVED" : "PENDING",
        role: bootstrap ? "HOD" : "STAFF",
        canSignOut: bootstrap,
        canManageUsers: bootstrap,
        googleAccounts: {
          create: {
            googleSub: state.google.sub,
            email: state.google.email,
          },
        },
      },
    });
  });

  revalidatePath("/", "layout");
  if (user.status === "APPROVED") {
    redirect("/");
  }
  redirect("/pending");
}

export async function approveUserAction(formData: FormData) {
  await requireHod();
  const id = String(formData.get("id") ?? "");
  const canSignOut = formData.get("canSignOut") === "on";
  const canManageUsers = formData.get("canManageUsers") === "on";
  const isHod = formData.get("isHod") === "on";

  await prisma.user.update({
    where: { id },
    data: {
      status: "APPROVED",
      canSignOut,
      canManageUsers: isHod ? true : canManageUsers,
      role: isHod ? "HOD" : "STAFF",
    },
  });

  revalidatePath("/users");
}

export async function updateUserPermissionsAction(formData: FormData) {
  const hod = await requireHod();
  const id = String(formData.get("id") ?? "");
  const canSignOut = formData.get("canSignOut") === "on";
  const canManageUsers = formData.get("canManageUsers") === "on";
  const isHod = formData.get("isHod") === "on";

  if (id === hod.id && !isHod) {
    throw new Error("You cannot remove your own HOD role");
  }

  await prisma.user.update({
    where: { id },
    data: {
      canSignOut,
      canManageUsers: isHod ? true : canManageUsers,
      role: isHod ? "HOD" : "STAFF",
    },
  });

  revalidatePath("/users");
}

export async function deleteUserAction(formData: FormData) {
  const hod = await requireHod();
  const id = String(formData.get("id") ?? "");
  if (id === hod.id) {
    throw new Error("You cannot remove your own account");
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return;

  const signOutCount = await prisma.signOut.count({ where: { userId: id } });
  if (signOutCount > 0) {
    await prisma.$transaction([
      prisma.googleAccount.deleteMany({ where: { userId: id } }),
      prisma.user.update({
        where: { id },
        data: {
          status: "PENDING",
          canSignOut: false,
          canManageUsers: false,
          role: "STAFF",
          name: `${existing.name} (left ${new Date().toISOString().slice(0, 10)})`,
        },
      }),
    ]);
  } else {
    await prisma.user.delete({ where: { id } });
  }

  revalidatePath("/users");
}

export async function removeGoogleAccountAction(formData: FormData) {
  await requireHod();
  const id = String(formData.get("id") ?? "");
  await prisma.googleAccount.delete({ where: { id } });
  revalidatePath("/users");
}
