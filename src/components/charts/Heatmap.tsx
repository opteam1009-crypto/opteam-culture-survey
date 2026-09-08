"use client";

import { useState } from "react";
import { formatScore, sequentialFill } from "@/lib/score";

export interface HeatmapColumn {
  key: string;
  label: string;
}

export interface HeatmapRow {
  key: string;
  label: string;
  count: number;
  values: Record<string, number | null>;
}

interface Props {
  columns: HeatmapColumn[];
  rows: HeatmapRow[];
}

/**
 * 부서 × 영역 점수표. 색은 순차(sequential) 파랑 한 가지 색상으로만 진하기를 바꾸며,
 * 모든 칸에 숫자를 함께 표시하므로 색이 유일한 정보 전달 수단이 되지 않습니다.
 */
export default function Heatmap({ columns, rows }: Props) {
  const [hover, setHover] = useState<{ row: string; col: string } | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
        표시할 응답이 아직 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate border-spacing-[2px] text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white px-2 pb-2 text-left text-xs font-semibold text-muted">
              부서
            </th>
            {columns.map((col) => (
              <th key={col.key} className="px-1 pb-2 text-center text-xs font-semibold text-muted">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th className="sticky left-0 bg-white px-2 py-1 text-left text-sm font-medium">
                <span className="block truncate">{row.label}</span>
                <span className="block text-[11px] font-normal tabular-nums text-muted">
                  {row.count}건
                </span>
              </th>
              {columns.map((col) => {
                const value = row.values[col.key] ?? null;
                const { fill, ink } = sequentialFill(value);
                const active = hover?.row === row.key && hover?.col === col.key;
                return (
                  <td
                    key={col.key}
                    className="relative rounded-md px-1 py-2.5 text-center text-[13px] font-semibold tabular-nums transition"
                    style={{
                      background: fill,
                      color: ink,
                      outline: active ? "2px solid #0b0b0b" : "none",
                      outlineOffset: "-2px",
                    }}
                    onMouseEnter={() => setHover({ row: row.key, col: col.key })}
                    onMouseLeave={() => setHover(null)}
                  >
                    {formatScore(value)}
                    {active && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-left text-xs font-normal text-ink shadow-lg">
                        <span className="block font-semibold">
                          {row.label} · {col.label}
                        </span>
                        <span className="block text-muted">
                          {formatScore(value)}점 · 응답 {row.count}건
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
        <span>낮음</span>
        {["#cde2fb", "#b7d3f6", "#86b6ef", "#3987e5", "#256abf", "#184f95"].map((c) => (
          <span key={c} className="h-3 w-6 rounded-sm" style={{ background: c }} />
        ))}
        <span>높음</span>
        <span className="ml-1">· 0~100점 환산</span>
      </p>
    </div>
  );
}
