"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { SignOutButton } from "./SignOutButton";
import { CloseIcon, MenuIcon } from "./Icons";

/**
 * App header: logo, nav links, theme switch, avatar, sign out.
 * On phones the links collapse behind a hamburger that opens a drawer.
 */
export function AppNav({ isAdmin, avatarUrl }: { isAdmin: boolean; avatarUrl: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on navigation and on Escape.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/trips", label: t.nav.trips },
    ...(isAdmin ? [{ href: "/admin/users", label: t.nav.admin }] : []),
  ];
  const isCurrent = (href: string) => (pathname === href || pathname.startsWith(href + "/") ? "page" : undefined);

  return (
    <header className="flex items-center gap-3 px-4 h-16 shrink-0 border-b border-line bg-surface">
      <Logo />
      <nav className="hidden sm:flex items-center gap-1 ml-3" aria-label={t.common.menu}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="navlink" aria-current={isCurrent(l.href)}>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="hidden sm:flex items-center gap-3">
        <ThemeToggle />
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : null}
        <SignOutButton />
      </div>
      <button
        className="btn icon ghost sm:hidden"
        aria-label={open ? t.common.closeMenu : t.common.openMenu}
        aria-expanded={open}
        aria-controls="app-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <>
          <div className="drawer-scrim sm:hidden" onClick={() => setOpen(false)} />
          <nav id="app-drawer" className="drawer sm:hidden" aria-label={t.common.menu}>
            <div className="flex items-center justify-between mb-2">
              <Logo height={30} />
              <button className="btn icon ghost" aria-label={t.common.closeMenu} onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="navlink" aria-current={isCurrent(l.href)}>
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold text-ink-2">{t.theme.label}</span>
              <ThemeToggle />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-3 px-3">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
              ) : null}
              <SignOutButton className="btn ghost" />
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}
