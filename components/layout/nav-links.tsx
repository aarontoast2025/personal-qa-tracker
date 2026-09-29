"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Settings } from "lucide-react";

export function NavLinks() {
  const pathname = usePathname();

  const links = [
    {
      href: "/assignments",
      label: "Assignments",
      icon: ClipboardList,
      isActive: pathname.startsWith("/assignments"),
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      isActive: pathname.startsWith("/settings"),
    },
  ];

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {links.map(({ href, label, icon: Icon, isActive }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            isActive
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold shadow-sm border border-amber-500/20"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              isActive
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-400 dark:text-slate-500"
            }`}
          />
          <span>{label}</span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          )}
        </Link>
      ))}
    </nav>
  );
}
