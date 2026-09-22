"use client";

import { Select } from "@/components/ui/Select";
import {
  ACTIVITY_RANGE_LABEL,
  ACTIVITY_RANGE_ORDER,
  type ActivityRangeKey,
} from "@/lib/dashboard/analytics";

const OPTIONS = ACTIVITY_RANGE_ORDER.map((key) => ({
  value: key,
  label: ACTIVITY_RANGE_LABEL[key],
}));

type RangeFilterProps = {
  value: ActivityRangeKey;
  onChange: (value: ActivityRangeKey) => void;
};

/**
 * The chart's time range, as the same dropdown the tables filter with. A
 * dropdown rather than a row of tabs because it holds one fixed width whatever
 * is selected — so it sits on the card's title row without pushing the heading
 * onto a second line as the options grow.
 */
export function RangeFilter({ value, onChange }: RangeFilterProps) {
  return (
    <Select
      ariaLabel="Time range"
      options={OPTIONS}
      value={value}
      onChange={(next) => onChange(next as ActivityRangeKey)}
      className="w-32 shrink-0 sm:w-36"
    />
  );
}
