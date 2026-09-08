"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatPeriod } from "@/lib/period";

export default function PeriodSelect({
  periods,
  current,
  basePath,
}: {
  periods: string[];
  current: string;
  basePath: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">회차</span>
      <select
        className="field w-auto py-1.5 text-sm"
        value={current}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set("period", event.target.value);
          router.push(`${basePath}?${next.toString()}`);
        }}
      >
        {periods.map((period) => (
          <option key={period} value={period}>
            {formatPeriod(period)}
          </option>
        ))}
      </select>
    </label>
  );
}
