"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoutIcon } from "@/components/ui/icons";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { clearAdminSession, getRefreshToken, useAdminSession } from "@/lib/auth/adminSession";
import { logout as logoutRequest } from "@/lib/api/adminAuth";

export function UserMenu() {
  const session = useAdminSession();
  const displayName = session?.name?.trim() || "Admin";
  const displayInitial = displayName[0]?.toUpperCase() ?? "A";
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        // Below sm the name is hidden, so the label keeps it for screen readers.
        aria-label={`Account menu, ${displayName}`}
        // Below sm: a 44px circle with just the initial, so the header title
        // keeps the width. From sm up: initial + name pill.
        className="flex h-11 w-11 items-center justify-center rounded-full bg-icon-action-bg transition-colors hover:bg-tint-strong sm:w-auto sm:min-w-[100px] sm:justify-start sm:gap-2.5 sm:px-1.5 sm:pr-3"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171658] text-sm font-bold leading-5 text-white dark:bg-[#FAF7F2] dark:text-[#171658]">
          {displayInitial}
        </span>

        <span className="hidden min-w-0 truncate text-sm font-semibold leading-5 text-ink sm:block">
          {displayName}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-brand/10 bg-surface py-1 shadow-modal"
        >
          {session?.email && (
            <p className="truncate border-b border-brand/10 px-3 py-2 text-xs font-medium text-muted">
              {session.email}
            </p>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setLogoutConfirmOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-danger hover:bg-tint-strong"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      )}

      <ConfirmModal
        open={isLogoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          // Revoking the refresh token server-side is best-effort: the local
          // session is cleared either way, so a failed or offline call still
          // signs the admin out here rather than stranding them in the shell.
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            void logoutRequest(refreshToken).catch(() => undefined);
          }
          clearAdminSession();
          router.push("/login");
        }}
        title="Log out"
        description="Are you sure you want to log out of the admin dashboard?"
        confirmLabel="Logout"
      />
    </div>
  );
}
