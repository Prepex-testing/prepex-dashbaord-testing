"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CollapsedSidebar } from "@/components/layout/CollapsedSidebar";
import { BottomNav } from "@/components/layout/BottomNav";

const SIDEBAR_COLLAPSED_KEY = "prepex-admin.sidebarCollapsed";
// Same-tab writes don't fire the native `storage` event (only other tabs get
// that), so writeStoredSidebarCollapsed dispatches this too — matching the
// pattern ThemeProvider uses for its own localStorage-backed state.
const SIDEBAR_COLLAPSED_CHANGE_EVENT = "prepex-admin-sidebar-collapsed-change";

function getStoredSidebarCollapsedSnapshot() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function getStoredSidebarCollapsedServerSnapshot() {
  return false;
}

function subscribeToStoredSidebarCollapsed(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_CHANGE_EVENT, onChange);
  };
}

function writeStoredSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // localStorage unavailable — collapse state just won't persist across reloads.
  }
  window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_CHANGE_EVENT));
}

export function AdminShell({ children }: { children: ReactNode }) {
  const isCollapsed = useSyncExternalStore(
    subscribeToStoredSidebarCollapsed,
    getStoredSidebarCollapsedSnapshot,
    getStoredSidebarCollapsedServerSnapshot,
  );

  return (
    <div className="flex min-h-screen flex-1 bg-background">
      {/* Both sidebars are always mounted and cross-fade, so collapsing only
          animates width and opacity — no remount, no layout jump. */}
      <div
        className={`relative hidden shrink-0 transition-[width] duration-700 ease-in-out lg:block ${
          isCollapsed ? "w-24.25" : "w-56"
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 flex transition-opacity duration-700 ease-in-out ${
            isCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <Sidebar onCollapse={() => writeStoredSidebarCollapsed(true)} />
        </div>
        <div
          className={`absolute inset-y-0 left-0 flex transition-opacity duration-700 ease-in-out ${
            isCollapsed ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <CollapsedSidebar onExpand={() => writeStoredSidebarCollapsed(false)} />
        </div>
      </div>

      {/* Bottom padding clears the mobile nav bar, which is fixed. */}
      <div className="min-w-0 flex-1 pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>

      <BottomNav />
    </div>
  );
}
