"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { clearAccountAction } from "@/actions/auth";

const links = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/equipment", label: "Equipment", short: "Equip" },
  { href: "/consumables", label: "Consumables", short: "Consum." },
  { href: "/sign-out", label: "Sign out", short: "Out" },
  { href: "/restock", label: "Restock", short: "Restock" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <>
      <header className="site-header">
        <div className="site-header__brand">
          <Link href="/" className="brand-mark">
            VIS Lab Tracker
          </Link>
          <p className="site-header__meta">Science department inventory</p>
        </div>

        <div className="site-header__end">
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
            {user?.canManageUsers ? (
              <Link href="/users" className={isActive(pathname, "/users") ? "is-active" : undefined}>
                Users
              </Link>
            ) : null}
          </nav>

          <div className="site-header__account">
            {user ? (
              <>
                <span className="site-header__user">
                  {user.name}
                  <em>{roleLabel(user.role)}</em>
                </span>
                <Link href="/account" className="btn btn-ghost btn-sm">
                  Switch
                </Link>
                <form action={clearAccountAction}>
                  <button type="submit" className="btn btn-ghost btn-sm">
                    Clear
                  </button>
                </form>
              </>
            ) : (
              <Link href="/account" className="btn btn-ghost btn-sm">
                Choose account
              </Link>
            )}
          </div>
        </div>
      </header>

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
        {user?.canManageUsers ? (
          <Link
            href="/users"
            className={isActive(pathname, "/users") ? "is-active" : undefined}
          >
            <span>Users</span>
          </Link>
        ) : null}
      </nav>
    </>
  );
}
