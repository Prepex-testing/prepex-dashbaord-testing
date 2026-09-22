"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import { ArrowLeftIcon } from "@/assets/icons";


type PageHeaderProps = {
  /** A node rather than a string so a page can slot a placeholder in while loading. */
  title: ReactNode;
  subtitle?: string;
  /** Shows a back arrow to the left of the title, as the app's subpages do. */
  backHref?: string;
  /** Extra controls (a primary action) shown left of the theme toggle. */
  children?: ReactNode;
};

/**
 * Title on the left, theme toggle + profile menu on the right — the same
 * header arrangement every screen in the student app uses, with its subpage
 * back arrow sitting beside the title rather than on a line of its own.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  children,
}: PageHeaderProps) {
  return (
    // Never wraps: the controls stay pinned top-right at every width, and it's
    // the title column that gives up width — its text wraps onto more lines
    // instead of pushing the controls onto a row of their own.
    <div className="flex items-start justify-between gap-3 sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink transition-colors hover:bg-tint-strong"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Link>
        )}

        {/* Titles carry data — a student's name, a resource type — so they
            step down on narrow screens and wrap rather than overflow. */}
        <div className="min-w-0">
          <h1 className="text-xl font-bold break-words text-ink sm:text-2xl lg:text-h1">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs break-words text-muted sm:text-sm">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {children}
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  );
}
