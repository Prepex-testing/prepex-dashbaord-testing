/**
 * A placeholder block standing in for content that hasn't arrived yet.
 *
 * Used instead of a full-page spinner so a refresh keeps the page's real
 * layout — headings, labels, the table's own columns — and only the parts
 * that carry data are replaced. Nothing moves when the data lands.
 *
 * The sweep animation lives in globals.css under `.skeleton`.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block rounded-full ${className}`} />;
}
