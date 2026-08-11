"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";
import {
  getAuthState,
  googleAccountTag,
  isBootstrapHodEmail,
  revalidateAllGoogleAccounts,
  requireHod,
} from "@/lib/auth";

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/auth/continue" });
}

export async function googleSignOutAction() {
  await signOut({ redirectTo: "/login" });
}

function parseAccountType(formData: FormData): "STAFF" | "STUDENT" {
  return formData.get("accountType") === "STUDENT" ? "STUDENT" : "STAFF";
}

function permissionsForRole(role: UserRole, canSignOut: boolean, canManageUsers: boolean) {
  if (role === "HOD") {
    return { role, canSignOut: true, canManageUsers: true };
  }
  if (role === "STUDENT") {
    return { role, canSignOut: false, canManageUsers: false };
  }
  return { role: "STAFF" as const, canSignOut, canManageUsers };
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

  const accountType = parseAccountType(formData);

  const existingLink = await prisma.googleAccount.findUnique({
    where: { googleSub: state.google.sub },
  });
  if (existingLink) {
    redirect("/auth/continue");
  }

  const bootstrap = isBootstrapHodEmail(state.google.email);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { name } });

    if (existing) {
      // Second (or later) Google login for this name — needs HOD approval
      // unless this email is a bootstrap HOD.
      const accountStatus = bootstrap ? "APPROVED" : "PENDING";
      await tx.googleAccount.create({
        data: {
          googleSub: state.google.sub,
          email: state.google.email,
          status: accountStatus,
          userId: existing.id,
        },
      });

      if (bootstrap) {
        const user = await tx.user.update({
          where: { id: existing.id },
          data: {
            role: "HOD",
            status: "APPROVED",
            canSignOut: true,
            canManageUsers: true,
          },
        });
        return { user, accountApproved: true };
      }

      return { user: existing, accountApproved: false };
    }

    const role: UserRole = bootstrap ? "HOD" : accountType;
    const perms = permissionsForRole(role, bootstrap, bootstrap);
    const user = await tx.user.create({
      data: {
        name,
        status: bootstrap ? "APPROVED" : "PENDING",
        ...perms,
        googleAccounts: {
          create: {
            googleSub: state.google.sub,
            email: state.google.email,
            status: bootstrap ? "APPROVED" : "PENDING",
          },
        },
      },
    });
    return { user, accountApproved: bootstrap };
  });

  revalidatePath("/", "layout");
  updateTag(googleAccountTag(state.google.sub));
  revalidateAllGoogleAccounts();
  if (result.user.status === "APPROVED" && result.accountApproved) {
    redirect("/");
  }
  redirect("/pending");
}

export async function approveUserAction(formData: FormData) {
  await requireHod();
  const id = String(formData.get("id") ?? "");
  const role = parseRole(formData);
  const canSignOut = formData.get("canSignOut") === "on";
  const canManageUsers = formData.get("canManageUsers") === "on";
  const perms = permissionsForRole(role, canSignOut, canManageUsers);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        status: "APPROVED",
        ...perms,
      },
    }),
    prisma.googleAccount.updateMany({
      where: { userId: id, status: "PENDING" },
      data: { status: "APPROVED" },
    }),
  ]);

  revalidateAllGoogleAccounts();
  revalidatePath("/users");
}

export async function approveGoogleAccountAction(formData: FormData) {
  await requireHod();
  const id = String(formData.get("id") ?? "");

  const account = await prisma.googleAccount.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!account) return;

  await prisma.$transaction(async (tx) => {
    await tx.googleAccount.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    if (account.user.status !== "APPROVED") {
      await tx.user.update({
        where: { id: account.userId },
        data: { status: "APPROVED" },
      });
    }
  });

  updateTag(googleAccountTag(account.googleSub));
  revalidatePath("/users");
}

function parseRole(formData: FormData): UserRole {
  const raw = String(formData.get("role") ?? "STAFF");
  if (raw === "HOD") return "HOD";
  if (raw === "STUDENT") return "STUDENT";
  if (formData.get("isHod") === "on") return "HOD";
  if (formData.get("isStudent") === "on") return "STUDENT";
  return "STAFF";
}

export async function updateUserPermissionsAction(formData: FormData) {
  const hod = await requireHod();
  const id = String(formData.get("id") ?? "");
  const role = parseRole(formData);
  const canSignOut = formData.get("canSignOut") === "on";
  const canManageUsers = formData.get("canManageUsers") === "on";

  if (id === hod.id && role !== "HOD") {
    throw new Error("You cannot remove your own HOD role");
  }

  await prisma.user.update({
    where: { id },
    data: permissionsForRole(role, canSignOut, canManageUsers),
  });

  revalidateAllGoogleAccounts();
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

  revalidateAllGoogleAccounts();
  revalidatePath("/users");
}

export async function removeGoogleAccountAction(formData: FormData) {
  await requireHod();
  const id = String(formData.get("id") ?? "");
  const account = await prisma.googleAccount.findUnique({ where: { id } });
  await prisma.googleAccount.delete({ where: { id } });
  if (account) updateTag(googleAccountTag(account.googleSub));
  revalidatePath("/users");
}
