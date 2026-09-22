import type { MouseEvent } from "react";
import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

/**
 * Click handler that makes a whole table row open `href`.
 *
 * A <tr> can't be an <a>, so each row also carries a real <Link> (on its
 * title) for keyboard and screen-reader users — clicks that land on that link,
 * or on any other interactive element in the row, are left to it. Cmd/Ctrl or
 * middle-style modified clicks open a new tab, as they would on a link.
 */
export function rowLinkClick(router: Router, href: string) {
  return (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, select, textarea, label")) return;
    // Selecting text in a row shouldn't navigate away from it.
    if (window.getSelection()?.toString()) return;

    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      window.open(href, "_blank", "noopener");
      return;
    }
    router.push(href);
  };
}
