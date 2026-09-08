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
  height?: number;
}

const PAD = { top: 16, right: 20, bottom: 26, left: 34 };
const GRID = [0, 25, 50, 75, 100];

export default function TrendChart({ points, seriesName, height = 230 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 컨테이너 실제 폭에 맞춰 그립니다. 고정 viewBox 로 두면 넓은 화면에서
  // 그래프가 가운데에 작게 박히고 양옆이 비어 버립니다.
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

  const plotW = Math.max(width - PAD.left - PAD.right, 80);
  const plotH = height - PAD.top - PAD.bottom;

  const valued = points.filter((p) => p.value !== null);
  if (valued.length === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <EmptyPlot height={height} />
      </div>
    );
  }


  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / 100) * plotH;

  const path = points
    .map((p, i) => (p.value === null ? null : `${x(i)},${y(p.value)}`))
    .filter(Boolean)
    .map((coord, idx) => `${idx === 0 ? "M" : "L"}${coord}`)
    .join(" ");

  const last = [...points].reverse().find((p) => p.value !== null);
  const lastIndex = last ? points.lastIndexOf(last) : -1;
  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
        role="img"
        aria-label={`${seriesName} 월별 추이`}
        onMouseLeave={() => setHover(null)}
      >
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

        <path d={path} fill="none" stroke={VIZ.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

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

        {/* 마지막 지점만 직접 라벨 — 모든 점에 숫자를 찍지 않습니다. */}
        {last && lastIndex >= 0 && hover === null && (
          <text
            x={x(lastIndex)}
            y={y(last.value as number) - 12}
            textAnchor={lastIndex === points.length - 1 ? "end" : "middle"}
            fontSize={12}
            fontWeight={700}
            fill={VIZ.ink}
          >
            {formatScore(last.value)}
          </text>
        )}

        {active && hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + plotH}
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
              height={plotH}
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

function EmptyPlot({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted"
      style={{ height }}
    >
      표시할 응답이 아직 없습니다.
    </div>
  );
}
