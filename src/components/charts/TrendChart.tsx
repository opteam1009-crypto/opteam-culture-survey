"use client";

import { useEffect, useRef, useState } from "react";
import { VIZ, formatScore } from "@/lib/score";
import { shortPeriod } from "@/lib/period";

export interface TrendPoint {
  period: string;
  value: number | null;
  count: number;
}

interface Props {
  points: TrendPoint[];
  /** 시리즈 이름. 단일 시리즈이므로 범례 대신 제목이 이름을 대신합니다. */
  seriesName: string;
}

const PAD = { top: 16, right: 20, bottom: 24, left: 34 };
const PLOT_H = 168;
const GAP = 18;
const COUNT_H = 54;
const GRID = [0, 25, 50, 75, 100];

/**
 * 위쪽은 점수 추이(선), 아래쪽은 같은 x 축을 공유하는 응답 건수(막대)입니다.
 * 두 지표의 단위가 달라 한 축에 겹치면 안 되므로 축을 나눠 아래위로 놓았습니다.
 * 건수를 함께 봐야 "응답이 3건뿐인 달의 평균"에 속지 않습니다.
 */
export default function TrendChart({ points, seriesName }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) setWidth(Math.round(next));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = PAD.top + PLOT_H + GAP + COUNT_H + PAD.bottom;
  const plotW = Math.max(width - PAD.left - PAD.right, 80);

  const valued = points.filter((p) => p.value !== null);
  if (valued.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted"
          style={{ height }}
        >
          표시할 응답이 아직 없습니다.
        </div>
      </div>
    );
  }

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + PLOT_H - (v / 100) * PLOT_H;

  const countTop = PAD.top + PLOT_H + GAP;
  const countBase = countTop + COUNT_H;
  const maxCount = Math.max(1, ...points.map((p) => p.count));
  const barW = Math.min(34, Math.max(10, plotW / Math.max(points.length, 1) - 14));

  const path = points
    .map((p, i) => (p.value === null ? null : `${x(i)},${y(p.value)}`))
    .filter(Boolean)
    .map((coord, idx) => `${idx === 0 ? "M" : "L"}${coord}`)
    .join(" ");

  const last = [...points].reverse().find((p) => p.value !== null);
  const lastIndex = last ? points.lastIndexOf(last) : -1;
  // 100점이면 점이 맨 위 눈금선에 붙어, 그 위에 적은 값이 그래프 밖으로 잘립니다.
  // 글자가 들어갈 여유가 없으면 점 아래쪽에 적습니다.
  const lastY = last ? y(last.value as number) : 0;
  const labelAbove = lastY - 12 >= 10;
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
        role="img"
        aria-label={`${seriesName} 월별 추이와 응답 건수`}
        onMouseLeave={() => setHover(null)}
      >
        {/* ── 점수 영역 ─────────────────────────────── */}
        {GRID.map((g) => (
          <g key={g}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(g)}
              y2={y(g)}
              stroke={g === 0 ? VIZ.axis : VIZ.grid}
              strokeWidth={1}
            />
            <text x={PAD.left - 7} y={y(g) + 3.5} textAnchor="end" fontSize={10} fill={VIZ.muted}>
              {g}
            </text>
          </g>
        ))}

        <path
          d={path}
          fill="none"
          stroke={VIZ.series}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) =>
          p.value === null ? null : (
            <circle
              key={p.period}
              cx={x(i)}
              cy={y(p.value)}
              r={hover === i ? 6 : 4.5}
              fill={VIZ.series}
              stroke={VIZ.surface}
              strokeWidth={2}
            />
          ),
        )}

        {last && lastIndex >= 0 && hover === null && (
          <text
            x={x(lastIndex)}
            y={labelAbove ? lastY - 12 : lastY + 18}
            textAnchor={lastIndex === points.length - 1 ? "end" : "middle"}
            fontSize={12}
            fontWeight={700}
            fill={VIZ.ink}
          >
            {formatScore(last.value)}
          </text>
        )}

        {/* ── 응답 건수 영역 ─────────────────────────── */}
        <text x={PAD.left - 7} y={countTop + 9} textAnchor="end" fontSize={9} fill={VIZ.muted}>
          건수
        </text>
        <line
          x1={PAD.left}
          x2={width - PAD.right}
          y1={countBase}
          y2={countBase}
          stroke={VIZ.axis}
          strokeWidth={1}
        />
        {points.map((p, i) => {
          const h = p.count === 0 ? 0 : Math.max(3, (p.count / maxCount) * (COUNT_H - 14));
          return (
            <g key={`bar-${p.period}`}>
              <rect
                x={x(i) - barW / 2}
                y={countBase - h}
                width={barW}
                height={h}
                rx={3}
                fill={hover === i ? VIZ.series : "#b7d3f6"}
              />
              <text
                x={x(i)}
                y={countBase - h - 4}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill={hover === i ? VIZ.ink : VIZ.muted}
              >
                {p.count}
              </text>
            </g>
          );
        })}

        {/* ── 공유 x 축과 히트 영역 ──────────────────── */}
        {active && hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={countBase}
            stroke={VIZ.axis}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {points.map((p, i) => (
          <g key={`hit-${p.period}`}>
            <rect
              x={x(i) - plotW / Math.max(points.length, 2) / 2}
              y={PAD.top}
              width={Math.max(plotW / Math.max(points.length, 1), 24)}
              height={countBase - PAD.top}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            <text x={x(i)} y={height - 8} textAnchor="middle" fontSize={10} fill={VIZ.muted}>
              {shortPeriod(p.period)}
            </text>
          </g>
        ))}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(x(hover as number) / width) * 100}%`, top: 4 }}
        >
          <div className="font-semibold">{active.period}</div>
          <div className="mt-0.5 tabular-nums text-muted">
            {formatScore(active.value)}점 · 응답 {active.count}건
          </div>
        </div>
      )}
    </div>
  );
}
