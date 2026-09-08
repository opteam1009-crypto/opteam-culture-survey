"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TIME_BAND_LABEL,
  WEEKDAY_LABELS,
  buildMonthGrid,
  type TimeBand,
} from "@/lib/schedule";

export interface CalendarEntry {
  responseId: string;
  name: string;
  department: string;
  riskLevel: number;
  ceoOnly: boolean;
  topic: string;
  /** 1순위 = 1, 2순위 = 2 */
  rank: 1 | 2;
  date: string | null;
  weekday: number | null;
  band: TimeBand;
  raw: string;
}

const COLS = [1, 2, 3, 4, 5, 6, 0]; // 월~일

export default function InterviewCalendar({
  entries,
  period,
}: {
  entries: CalendarEntry[];
  period: string;
}) {
  const [refYear, refMonth] = period.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: refYear, month: refMonth });

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      if (!entry.date) continue;
      const bucket = map.get(entry.date);
      if (bucket) bucket.push(entry);
      else map.set(entry.date, [entry]);
    }
    return map;
  }, [entries]);

  const weekdayOnly = entries.filter((e) => !e.date && e.weekday !== null);
  const unresolved = entries.filter((e) => !e.date && e.weekday === null);
  const datedCount = entries.filter((e) => e.date).length;

  function shift(delta: number) {
    const next = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1));
    setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 });
  }

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-brandTint px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => shift(-1)}>
              ←
            </button>
            <h2 className="text-[15px] font-bold tabular-nums">
              {cursor.year}년 {cursor.month}월
            </h2>
            <button type="button" className="btn-ghost px-2.5 py-1.5 text-xs" onClick={() => shift(1)}>
              →
            </button>
          </div>
          <p className="text-xs text-muted">
            날짜가 특정된 희망 {datedCount}건을 표시합니다
          </p>
        </header>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-line bg-gray-50">
              {COLS.map((w) => (
                <div
                  key={w}
                  className={`px-2 py-2 text-center text-[11px] font-bold ${
                    w === 0 ? "text-red-500" : w === 6 ? "text-blue-500" : "text-muted"
                  }`}
                >
                  {WEEKDAY_LABELS[w]}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {grid.map((cell, i) => {
                const items = cell.date ? (byDate.get(cell.date) ?? []) : [];
                return (
                  <div
                    key={i}
                    className={`min-h-[92px] border-b border-r border-line/70 p-1.5 ${
                      cell.inMonth ? "bg-white" : "bg-gray-50/60"
                    } ${i % 7 === 6 ? "border-r-0" : ""}`}
                  >
                    <div
                      className={`mb-1 text-[11px] font-bold tabular-nums ${
                        !cell.inMonth
                          ? "text-gray-300"
                          : cell.isToday
                            ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white"
                            : cell.weekday === 0
                              ? "text-red-500"
                              : cell.weekday === 6
                                ? "text-blue-500"
                                : "text-muted"
                      }`}
                    >
                      {cell.day}
                    </div>
                    <div className="space-y-1">
                      {items.map((item, j) => (
                        <PersonChip key={`${item.responseId}-${item.rank}-${j}`} entry={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {weekdayOnly.length > 0 && (
        <section className="card p-6">
          <h2 className="text-base font-bold">요일만 적어주신 응답</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            날짜 없이 요일과 시간대만 적혀 있어 달력에 놓을 수 없습니다. 아래에서 겹치는 시간대를
            골라 일정을 잡으시면 됩니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="w-20 px-2 pb-1 text-left text-[11px] font-semibold text-muted">
                    시간대
                  </th>
                  {COLS.slice(0, 5).map((w) => (
                    <th key={w} className="px-2 pb-1 text-center text-[11px] font-semibold text-muted">
                      {WEEKDAY_LABELS[w]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["morning", "afternoon", "evening", "unknown"] as TimeBand[]).map((band) => {
                  const rowItems = weekdayOnly.filter((e) => e.band === band);
                  if (rowItems.length === 0) return null;
                  return (
                    <tr key={band}>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-muted">
                        {TIME_BAND_LABEL[band]}
                      </th>
                      {COLS.slice(0, 5).map((w) => {
                        const cellItems = rowItems.filter((e) => e.weekday === w);
                        return (
                          <td
                            key={w}
                            className={`rounded-lg p-1.5 align-top ${
                              cellItems.length > 0 ? "bg-brandSoft" : "bg-gray-50"
                            }`}
                          >
                            <div className="space-y-1">
                              {cellItems.map((item, j) => (
                                <PersonChip key={`${item.responseId}-${item.rank}-${j}`} entry={item} />
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {unresolved.length > 0 && (
        <section className="card p-6">
          <h2 className="text-base font-bold">날짜를 알아볼 수 없는 응답</h2>
          <p className="mb-3 mt-1 text-sm text-muted">
            적어주신 표현에서 날짜나 요일을 읽어내지 못했습니다. 원문 그대로 확인해 주세요.
          </p>
          <ul className="divide-y divide-line text-sm">
            {unresolved.map((item, i) => (
              <li key={`${item.responseId}-${item.rank}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <Link
                  href={`/dashboard/responses/${item.responseId}`}
                  className="font-medium text-brand hover:underline"
                >
                  {item.name}
                </Link>
                <span className="text-xs text-muted">{item.department}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-muted">
                  {item.rank}순위
                </span>
                <span className="text-ink">&ldquo;{item.raw}&rdquo;</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PersonChip({ entry }: { entry: CalendarEntry }) {
  const tone =
    entry.riskLevel >= 2
      ? { bg: "#fbeaea", ink: "#9c2b2b" }
      : entry.riskLevel === 1
        ? { bg: "#fdeee7", ink: "#93441f" }
        : { bg: "#eef3fb", ink: "#1f4d8f" };

  return (
    <Link
      href={`/dashboard/responses/${entry.responseId}`}
      title={`${entry.department} ${entry.name} · ${entry.rank}순위 · ${entry.raw}`}
      className="block truncate rounded px-1.5 py-1 text-[11px] font-semibold leading-tight transition hover:brightness-95"
      style={{ background: tone.bg, color: tone.ink }}
    >
      {entry.ceoOnly && <span aria-hidden>🔒</span>}
      {entry.name}
      <span className="ml-1 font-normal opacity-70">
        {entry.rank === 2 ? "2순위" : ""} {TIME_BAND_LABEL[entry.band] === "시간 미지정" ? "" : TIME_BAND_LABEL[entry.band]}
      </span>
    </Link>
  );
}
