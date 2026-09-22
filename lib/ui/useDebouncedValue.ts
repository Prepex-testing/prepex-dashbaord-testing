"use client";

import { useEffect, useState } from "react";

/**
 * Trails `value` by `delayMs`, restarting the wait each time it changes.
 *
 * Two jobs in the students table: debouncing the search box so it doesn't
 * re-filter on every keystroke, and — by comparing the trailing value against
 * the live one — telling whether a change is still settling, which is what
 * drives the loading placeholders.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    if (Object.is(settled, value)) return;
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, settled, delayMs]);

  return settled;
}
