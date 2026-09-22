"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  /** Rendered above the trigger; omit for a bare control in a toolbar. */
  label?: string;
  /** Screen-reader name when `label` is omitted. */
  ariaLabel?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Shown until something is picked. */
  placeholder?: string;
  labelClassName?: string;
  /** Replaces the trigger's box metrics — height, gap, radius and padding. */
  triggerClassName?: string;
  /** Extra classes for the root wrapper, e.g. a fixed width. */
  className?: string;
};

/**
 * A listbox built out of buttons rather than a native `<select>`.
 *
 * Same approach as the student app's CustomSelect, and for the same reason: a
 * native select can't be styled consistently across browsers, and its option
 * list ignores the app's theme entirely. Everything here is `min-w-0` and
 * truncated so a long option can never push the control past its container.
 */
export function Select({
  label,
  ariaLabel,
  options,
  value,
  onChange,
  placeholder = "Select",
  labelClassName = "text-sm font-medium leading-none text-body-text dark:text-ink",
  triggerClassName = "h-11 gap-2 rounded-xl px-3 py-2",
  className = "",
}: SelectProps) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative flex min-w-0 max-w-full flex-col gap-2 ${className}`}
    >
      {label && <label className={labelClassName}>{label}</label>}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel ?? label}
        onClick={() => setOpen((open) => !open)}
        className={`flex w-full min-w-0 max-w-full items-center justify-between border border-input-border bg-surface text-left shadow-input outline-none transition-colors focus:border-input-border ${triggerClassName} ${
          selectedLabel
            ? "text-[14px] font-medium text-ink"
            : "text-[14px] font-normal text-[#666666] dark:text-[#8B8998]"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{selectedLabel ?? placeholder}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel ?? label}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 max-w-full overflow-y-auto rounded-xl border border-input-border bg-surface p-1 shadow-modal"
        >
          {options.length > 0 ? (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  title={option.label}
                  className={`block w-full min-w-0 truncate rounded-lg px-3 py-2 text-left text-sm hover:bg-tint-strong ${
                    isSelected ? "bg-tint-strong font-semibold text-ink" : "text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-muted">No options available</p>
          )}
        </div>
      )}
    </div>
  );
}
