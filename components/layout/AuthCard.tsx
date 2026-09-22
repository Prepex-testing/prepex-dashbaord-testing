"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Shell for every onboarding screen. The card slides in from the right so
 * moving forward through the flow (login → forgot password → OTP → reset)
 * reads as one continuous motion.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-3 py-6 sm:px-6 sm:py-12">
      {/*
       * Theme is switchable before signing in too — the toggle is the same
       * control the dashboard header uses, bordered here because it sits on
       * the page background rather than inside a card, where the light-theme
       * white fill would have no edge.
       *
       * From sm up it stays pinned to the page corner, unchanged. Below sm it
       * drops into the flow above the card instead: the card is tall enough on
       * a phone to start at the very top of the page, so a toggle pinned at
       * top-4 sat on top of it.
       */}
      <div className="mb-3 flex w-full max-w-3xl justify-end sm:absolute sm:top-6 sm:right-6 sm:mb-0 sm:w-auto sm:max-w-none">
        <ThemeToggle className="border border-sidebar-border shadow-sm" />
      </div>

      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 70,
          damping: 18,
          mass: 1.2,
        }}
        className="w-full max-w-3xl rounded-3xl bg-surface p-6 shadow-modal sm:p-12"
      >
        {children}
      </motion.div>
    </main>
  );
}
