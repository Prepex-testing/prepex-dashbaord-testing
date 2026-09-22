import type { ComponentType, SVGProps } from "react";
import { BookIcon, MathIcon, PlayIcon, ListIcon } from "@/assets/icons";
import type { ResourceIconKey } from "@/lib/resources/catalog";

/**
 * Icon per content type. Kept beside the catalog rather than in it so the
 * catalog stays plain data with no JSX.
 */
export const RESOURCE_TYPE_ICONS: Record<
  ResourceIconKey,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  notes: BookIcon,
  formula: MathIcon,
  lecture: PlayIcon,
  question: ListIcon,
};
