"use client";

import {
  ArrowLeft,
  Boxes,
  Building2,
  LayoutDashboard,
  SlidersHorizontal,
  ToggleLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  const links = [
    { href: "/admin", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/plans", label: t("plans"), icon: Boxes },
    { href: "/admin/features", label: t("features"), icon: ToggleLeft },
    { href: "/admin/overrides", label: t("overrides"), icon: SlidersHorizontal },
    { href: "/admin/orgs", label: t("orgs"), icon: Building2 },
  ];

  return (
    <header className="app-nav">
      <div className="max-w-7xl mx-auto px-4 app-nav-inner">
        <div className="flex items-center gap-4">
          <Link href="/" className="app-logo">
            <div className="app-logo-mark">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
              >
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 4-6" />
              </svg>
            </div>
            <span className="app-logo-text">DataPresent</span>
          </Link>
          <span className="app-badge app-badge-outline">{t("badge")}</span>
        </div>
        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-2" aria-label="Admin">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn("app-nav-link", isActive && "active")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:block app-nav-divider" />
          <Link href="/" className="app-nav-link">
            <ArrowLeft className="w-4 h-4" />
            {t("backToApp")}
          </Link>
        </div>
      </div>
    </header>
  );
}
