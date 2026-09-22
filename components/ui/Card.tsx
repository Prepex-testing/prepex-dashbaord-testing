import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

/** The standard panel every dashboard section sits in. */
export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-task-card-border bg-card p-5 shadow-quick-access sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
