import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

const COOKIE_NAME = "lab_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  name: string;
  role: User["role"];
  canSignOut: boolean;
  canManageUsers: boolean;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    canSignOut: user.canSignOut,
    canManageUsers: user.canManageUsers,
  };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    role: user.role,
    canSignOut: user.canSignOut,
    canManageUsers: user.canManageUsers,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.id !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    return {
      id: payload.id,
      name: payload.name,
      role: payload.role as SessionUser["role"],
      canSignOut: Boolean(payload.canSignOut),
      canManageUsers: Boolean(payload.canManageUsers),
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const user = await getSession();
  if (!user) {
    throw new Error("Select an account first");
  }
  return user;
}

export async function requireSignOutPermission() {
  const user = await requireSession();
  if (!user.canSignOut) {
    throw new Error("You are not authorised to sign items out");
  }
  return user;
}

export async function requireManageUsers() {
  const user = await requireSession();
  if (!user.canManageUsers) {
    throw new Error("Only HOD or Admin can manage authorised users");
  }
  return user;
}

/** HOD / Admin — edit catalog, stock take, locations */
export async function requireAdmin() {
  const user = await requireSession();
  if (!user.canManageUsers) {
    throw new Error("Only HOD or Admin can do this");
  }
  return user;
}

export function isAdmin(user: SessionUser | null) {
  return Boolean(user?.canManageUsers);
}

export async function switchToUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const session = toSessionUser(user);
  await createSession(session);
  return session;
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
  });
}
