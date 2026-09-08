"use client";

import { useState } from "react";
import { VIZ, formatScore, scoreTone } from "@/lib/score";

export interface BarItem {
  key: string;
  label: string;
  value: number | null;
  count?: number;
  hint?: string;
}

interface Props {
  items: BarItem[];
  /** 점수 구간 배지를 함께 보여줍니다(부서·섹션 비교용). */
  showTone?: boolean;
  emptyMessage?: string;
}

export default function BarList({ items, showTone = false, emptyMessage = "표시할 응답이 아직 없습니다." }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const tone = scoreTone(item.value);
        const pct = item.value === null ? 0 : Math.max(0, Math.min(100, item.value));
        const active = hover === item.key;
        return (
          <li
            key={item.key}
            className={`relative -mx-2 rounded-lg px-2 py-1.5 transition ${active ? "bg-gray-50" : ""}`}
            onMouseEnter={() => setHover(item.key)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium" title={item.label}>
                {item.label}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {showTone && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: tone.bg, color: tone.ink }}
                  >
                    {tone.label}
                  </span>
                )}
                <span className="text-sm font-bold tabular-nums">{formatScore(item.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div
                className="h-2.5 flex-1 overflow-hidden rounded-full"
                style={{ background: VIZ.track }}
              >
                <div
                  className="h-full rounded-r-[4px] transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: VIZ.series }}
                />
              </div>
              {item.count !== undefined && (
                <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted">
                  {item.count}건
                </span>
              )}
            </div>
            {item.hint && <p className="mt-1 text-[11px] text-muted">{item.hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}
