"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import HankoLogo from "@/components/HankoLogo";

const LINKS = [
  { href: "/dashboard", key: "dashboard", icon: "進" },
  { href: "/study", key: "study", icon: "練" },
  { href: "/mock", key: "mock", icon: "模" },
  { href: "/flashcards", key: "flashcards", icon: "札" },
  { href: "/ingest", key: "ingest", icon: "入" },
  { href: "/review", key: "review", icon: "審" },
  { href: "/roadmap", key: "roadmap", icon: "路" },
  { href: "/jobs", key: "jobs", icon: "処" },
] as const;

export default function Sidebar({
  dict,
  userName,
}: {
  dict: Dict;
  userName?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col items-center border-r border-ink/10 bg-white/70 backdrop-blur md:w-60 md:items-stretch md:px-4 md:py-6">
      <Link
        href="/dashboard"
        className="mb-8 flex items-center justify-center gap-3 focus-ring rounded-lg md:justify-start"
      >
        <HankoLogo size="md" />
        <div className="hidden leading-tight md:block">
          <div className="font-jp-display text-sm font-bold">{dict.common.appName}</div>
          <div className="text-[10px] tracking-wide text-ink/50">{dict.common.tagline}</div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {LINKS.map((link) => {
          const active =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium transition-colors focus-ring md:px-3 ${
                active
                  ? "bg-ink text-paper"
                  : "text-ink/60 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <span
                className={`hanko h-7 w-7 text-[10px] ${
                  active ? "bg-paper text-ink" : ""
                }`}
              >
                {link.icon}
              </span>
              <span className="hidden md:inline">{dict.nav[link.key]}</span>
            </Link>
          );
        })}
      </nav>

      {userName && (
        <div className="hidden border-t border-ink/10 pt-4 md:block">
          <div className="truncate text-sm font-medium">{userName}</div>
          <div className="truncate text-xs text-ink/40">JLPT N1 · BJT J1</div>
        </div>
      )}
    </aside>
  );
}