import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

/**
 * The two admin variants:
 * - `primary`   filled CTA orange — one per screen, the action being asked for.
 * - `secondary` outlined on the surface — everything else (cancel, back, ghost
 *               actions in a toolbar).
 */
type Variant = "primary" | "secondary";
type Size = "sm" | "md";

const BASE_CLASSES =
  "flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed";

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-14 w-full text-base",
  sm: "h-9 w-auto px-4 text-sm",
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border border-primary-button-border bg-cta text-white hover:bg-[#E8623F] hover:shadow-hover active:bg-[#D9552F] disabled:border-primary-button-disabled-bg disabled:bg-primary-button-disabled-bg disabled:text-primary-button-disabled-text disabled:hover:bg-primary-button-disabled-bg disabled:hover:shadow-none",
  secondary:
    "border-[1.5px] border-secondary-button-border bg-surface text-body-text hover:bg-tint-strong disabled:border-[#D8D4CC] disabled:bg-surface disabled:text-[#8B8998] disabled:hover:bg-surface",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  href,
  children,
  className = "",
  onClick,
  ...props
}: ButtonProps) {
  const classes = `${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={onClick as unknown as MouseEventHandler<HTMLAnchorElement>}
      >
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...props}>
      {children}
    </button>
  );
}
