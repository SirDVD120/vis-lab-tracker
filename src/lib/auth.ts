import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";
import { redirect } from "next/navigation";

export type SessionUser = {
  id: string;
  name: string;
  role: User["role"];
  status: User["status"];
  canSignOut: boolean;
  canManageUsers: boolean;
  email?: string;
};

export type GoogleIdentity = {
  sub: string;
  email: string;
  name?: string | null;
};

export type AuthState =
  | { status: "anonymous" }
  | { status: "unclaimed"; google: GoogleIdentity }
  | { status: "pending"; user: SessionUser; google: GoogleIdentity }
  | { status: "approved"; user: SessionUser; google: GoogleIdentity };

function toSessionUser(user: User, email?: string): SessionUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status,
    canSignOut: user.canSignOut,
    canManageUsers: user.canManageUsers,
    email,
  };
}

function bootstrapEmails() {
  return (process.env.HOD_BOOTSTRAP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isBootstrapHodEmail(email: string) {
  return bootstrapEmails().includes(email.trim().toLowerCase());
}

export async function getAuthState(): Promise<AuthState> {
  const session = await auth();
  const googleSub = session?.googleSub;
  const email = session?.user?.email;

  if (!googleSub || !email) {
    return { status: "anonymous" };
  }

  const google: GoogleIdentity = {
    sub: googleSub,
    email,
    name: session.user?.name,
  };

  const account = await prisma.googleAccount.findUnique({
    where: { googleSub },
    include: { user: true },
  });

  if (!account) {
    return { status: "unclaimed", google };
  }

  const user = toSessionUser(account.user, account.email);
  if (account.user.status === "APPROVED" && account.status === "APPROVED") {
    return { status: "approved", user, google };
  }
  return { status: "pending", user, google };
}

/** Approved app user only — null if anonymous / unclaimed / pending */
export async function getSession(): Promise<SessionUser | null> {
  const state = await getAuthState();
  return state.status === "approved" ? state.user : null;
}

/** Redirect unauthenticated / pending users away from app pages */
export async function requireApprovedPage() {
  const state = await getAuthState();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "unclaimed") redirect("/claim");
  if (state.status === "pending") redirect("/pending");
  return state.user;
}

/** Staff/HOD pages — students are browse-only */
export async function requireStaffPage() {
  const user = await requireApprovedPage();
  if (isStudent(user)) redirect("/");
  return user;
}

export async function requireSession() {
  const user = await getSession();
  if (!user) {
    throw new Error("Sign in required");
  }
  return user;
}

export async function requireSignOutPermission() {
  const user = await requireSession();
  if (isStudent(user) || !user.canSignOut) {
    throw new Error("You are not authorised to sign items out");
  }
  return user;
}

/** Inventory catalog / stock take — HOD or staff with catalog flag */
export async function requireAdmin() {
  const user = await requireSession();
  if (!isAdmin(user)) {
    throw new Error("Only HOD or catalog managers can do this");
  }
  return user;
}

/** Approve users / change roles — HOD only */
export async function requireHod() {
  const user = await requireSession();
  if (!isHod(user)) {
    throw new Error("Only HOD can manage users");
  }
  return user;
}

export function isHod(user: SessionUser | null) {
  return user?.role === "HOD";
}

export function isStudent(user: SessionUser | null) {
  return user?.role === "STUDENT";
}

export function isAdmin(user: SessionUser | null) {
  return Boolean(user && (user.role === "HOD" || user.canManageUsers));
}

export async function listUsers() {
  return prisma.user.findMany({
    include: { googleAccounts: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}
