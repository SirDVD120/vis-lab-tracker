"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { googleSignOutAction } from "@/actions/auth";

const staffLinks = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/equipment", label: "Equipment", short: "Equip" },
  { href: "/consumables", label: "Consumables", short: "Consum." },
  { href: "/sign-out", label: "Sign out", short: "Out" },
  { href: "/restock", label: "Restock", short: "Restock" },
];

const studentLinks = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/equipment", label: "Equipment", short: "Equip" },
  { href: "/consumables", label: "Consumables", short: "Consum." },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const hideNav = ["/login", "/claim", "/pending"].includes(pathname);
  const links = user?.role === "STUDENT" ? studentLinks : staffLinks;

  return (
    <>
      <header className="site-header">
        <div className="site-header__brand">
          <Link href={user ? "/" : "/login"} className="brand-mark">
            VIS Lab Tracker
          </Link>
          <p className="site-header__meta">Science department inventory</p>
        </div>

        <div className="site-header__end">
          {!hideNav && user ? (
            <nav className="site-header__nav site-header__nav--desktop" aria-label="Main">
              {links.slice(1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={isActive(pathname, link.href) ? "is-active" : undefined}
                >
                  {link.label}
                </Link>
              ))}
              {user.role === "HOD" ? (
                <Link href="/users" className={isActive(pathname, "/users") ? "is-active" : undefined}>
                  Users
                </Link>
              ) : null}
            </nav>
          ) : null}

          <div className="site-header__account">
            {user ? (
              <>
                <span className="site-header__user">
                  {user.name}
                  <em>{roleLabel(user.role)}</em>
                </span>
                <form action={googleSignOutAction}>
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Sign out
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {!hideNav && user ? (
        <nav className="mobile-nav" aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(pathname, link.href) ? "is-active" : undefined}
            >
              <span>{link.short}</span>
            </Link>
          ))}
          {user.role === "HOD" ? (
            <Link
              href="/users"
              className={isActive(pathname, "/users") ? "is-active" : undefined}
            >
              <span>Users</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
