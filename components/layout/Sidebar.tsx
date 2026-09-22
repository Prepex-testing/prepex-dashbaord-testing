"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { ChevronRightIcon } from "@/components/ui/icons";
import { DashboardIcon, UsersNavIcon, ResourceIcon } from "@/assets/icons";

// 20x20 icon slot containing a 16x16 glyph — same sizing the student app uses.
const ICON_BOX_CLASS = "flex h-5 w-5 shrink-0 items-center justify-center";
const ICON_CLASS = "h-4 w-4";

export const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <DashboardIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    href: "/users",
    label: "Users",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <UsersNavIcon className={ICON_CLASS} />
      </span>
    ),
  },
  {
    href: "/resources",
    label: "Resources",
    icon: (
      <span className={ICON_BOX_CLASS}>
        <ResourceIcon className={ICON_CLASS} />
      </span>
    ),
  },
];

/** True when `pathname` is the nav item's route or one of its subpages. */
export function isNavItemActive(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

type SidebarProps = {
  onCollapse?: () => void;
};

export function Sidebar({ onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="relative hidden w-56 shrink-0 flex-col gap-8 border-r border-brand/10 bg-surface px-4 py-6 lg:flex">
      <div className="px-2">
        <Logo size="compact" showTagline={false} layout="horizontal" />
      </div>

      {onCollapse && (
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          className="absolute -right-3.5 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-surface text-sidebar-inactive-fg shadow-sm hover:bg-sidebar-active-bg hover:text-sidebar-active-fg"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>
      )}

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-sidebar-active-bg text-sidebar-active-fg"
                  : "text-sidebar-inactive-fg hover:bg-sidebar-active-bg hover:text-sidebar-active-fg"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
