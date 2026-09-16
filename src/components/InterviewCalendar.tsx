"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TIME_BAND_LABEL,
  WEEKDAY_LABELS,
  buildMonthGrid,
  type TimeBand,
} from "@/lib/schedule";
import type { InterviewStatus } from "@/lib/queries";
import InterviewScheduleControls from "./InterviewScheduleControls";

export interface CalendarEntry {
  responseId: string;
  name: string;
  department: string;
  riskLevel: number;
  /** 「인사책임자에게 전달」 을 고른 응답. 면담을 인사책임자와 하고 싶다는 뜻입니다. */
  hrOnly: boolean;
  topic: string;
  /** 1순위 = 1, 2순위 = 2 */
  rank: 1 | 2;
  /** 관리자가 확정한 일정이면 순위 대신 "확정" 으로 표시합니다. */
  confirmed?: boolean;
  /** 칩을 눌렀을 때 그 자리에서 일정을 바꾸기 위해 함께 싣습니다. */
  status: InterviewStatus;
  scheduledAt: string | null;
  first: string;
  second: string;
  /** 이 칩이 가리키는 'YYYY-MM-DD HH:MM'. 누른 칩의 날짜로 확정할 때 씁니다. */
  slot: string;
  date: string | null;
  weekday: number | null;
  band: TimeBand;
  /** 시간까지 고른 경우의 표시 문구(예: "오전 10:30"). 자유 입력이면 null. */
  time: string | null;
  raw: string;
}

/**
 * 칩 색이 뜻하는 것. 「조직 리스크 체크」 응답의 심각도입니다.
 * 범례와 칩이 같은 값을 쓰도록 여기 한 곳에만 둡니다.
 */
const RISK_TONES = [
  { label: "정상", bg: "#eef3fb", ink: "#1f4d8f" },
  { label: "주의", bg: "#fdeee7", ink: "#93441f" },
  { label: "확인 필요", bg: "#fbeaea", ink: "#9c2b2b" },
];

function toneOf(riskLevel: number) {
  return RISK_TONES[Math.min(Math.max(riskLevel, 0), RISK_TONES.length - 1)];
}

/** 달력 칸 순서. 일요일이 맨 앞, 토요일이 맨 뒤입니다. */
const COLS = [0, 1, 2, 3, 4, 5, 6]; // 일~토

/** 요일만 적어준 응답을 놓는 표는 평일만 씁니다. */
const WEEKDAY_COLS = [1, 2, 3, 4, 5]; // 월~금

/** 칩 하나를 가리키는 키. 같은 사람도 1순위·2순위는 서로 다른 칩입니다. */
function chipKey(entry: CalendarEntry): string {
  return `${entry.responseId}:${entry.rank}:${entry.slot}`;
}

export default function InterviewCalendar({
  entries,
  period,
}: {
  entries: CalendarEntry[];
  period: string;
}) {
  const [refYear, refMonth] = period.split("-").map(Number);
  const [cursor, setCursor] = useState({ year: refYear, month: refMonth });
  // 칩을 누르면 달력 위에 그 칩의 일정 조작 칸을 엽니다.
  // 칸 안에 바로 펼치면 날짜 칸이 밀려 달력이 흐트러집니다.
  // 같은 사람이라도 1순위·2순위는 다른 칩이므로 사람이 아니라 칩 단위로 고릅니다.
  const [picked, setPicked] = useState<string | null>(null);

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

  const pickedEntry = picked ? entries.find((e) => chipKey(e) === picked) : undefined;
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
          {/*
            색이 무엇을 뜻하는지 적어두지 않으면 읽는 사람은 알 수가 없습니다.
            「조직 리스크 체크」 응답의 심각도입니다.
          */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-muted">
            <span className="font-semibold text-ink">색</span>
            {RISK_TONES.map((t) => (
              <span key={t.label} className="inline-flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: t.bg, border: `1px solid ${t.ink}33` }}
                />
                {t.label}
              </span>
            ))}
            <span>= 조직 리스크 체크 응답</span>
            <span className="text-line">|</span>
            <span>
              <b className="font-semibold text-ink">확정</b> 잡힌 일정 ·{" "}
              <b className="font-semibold text-ink">1·2순위</b> 응답자가 적어낸 희망
            </span>
          </div>
        </header>

        {pickedEntry && (
          <div className="border-t border-line bg-brandTint px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold">
                  {pickedEntry.name}
                  <span className="ml-2 text-sm font-medium text-muted">
                    {pickedEntry.department}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {pickedEntry.confirmed ? "확정" : `${pickedEntry.rank}순위 희망`}
                  {pickedEntry.time ? ` · ${pickedEntry.time}` : ""}
                  {pickedEntry.topic ? ` · ${pickedEntry.topic}` : ""}
                  {` · 리스크 ${toneOf(pickedEntry.riskLevel).label}`}
                  {pickedEntry.hrOnly ? " · 인사책임자와 면담 희망" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <InterviewScheduleControls
                  // 다른 칩을 누르면 새로 만들어야 합니다. 같은 컴포넌트를 재사용하면
                  // 앞서 고른 날짜가 그대로 남아 엉뚱한 날로 확정하게 됩니다.
                  key={chipKey(pickedEntry)}
                  responseId={pickedEntry.responseId}
                  name={pickedEntry.name}
                  status={pickedEntry.status}
                  scheduledAt={pickedEntry.scheduledAt}
                  first={pickedEntry.first}
                  second={pickedEntry.second}
                  presetAt={pickedEntry.slot}
                  // 확정된 칩이 아니라 희망 칩이면 그 일시만 지울 수 있게 합니다.
                  slotRank={pickedEntry.confirmed ? undefined : pickedEntry.rank}
                />
                <Link
                  href={`/dashboard/responses/${pickedEntry.responseId}`}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  응답 보기
                </Link>
                <button
                  type="button"
                  className="text-xs text-muted hover:text-ink"
                  onClick={() => setPicked(null)}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-7 border-b border-line bg-gray-50">
              {COLS.map((w) => (
                <div
                  key={w}
                  className={`px-2 py-2.5 text-center text-xs font-bold ${
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
                    className={`min-h-[118px] border-b border-r border-line/70 p-2 ${
                      cell.inMonth ? "bg-white" : "bg-gray-50/60"
                    } ${i % 7 === 6 ? "border-r-0" : ""}`}
                  >
                    <div
                      className={`mb-1.5 text-xs font-bold tabular-nums ${
                        !cell.inMonth
                          ? "text-gray-300"
                          : cell.isToday
                            ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white"
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
                        <PersonChip
                          key={`${item.responseId}-${item.rank}-${j}`}
                          entry={item}
                          active={picked === chipKey(item)}
                          onPick={() =>
                            setPicked((v) => (v === chipKey(item) ? null : chipKey(item)))
                          }
                        />
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
                  {WEEKDAY_COLS.map((w) => (
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
                      {WEEKDAY_COLS.map((w) => {
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
                                <PersonChip
                                  key={`${item.responseId}-${item.rank}-${j}`}
                                  entry={item}
                                  active={picked === chipKey(item)}
                                  onPick={() =>
                                    setPicked((v) => (v === chipKey(item) ? null : chipKey(item)))
                                  }
                                />
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

function PersonChip({
  entry,
  active,
  onPick,
}: {
  entry: CalendarEntry;
  active: boolean;
  onPick: () => void;
}) {
  const tone = toneOf(entry.riskLevel);

  // 시간까지 고른 응답은 "오전 10:30", 예전 자유 입력은 "오전" 처럼 시간대만 나옵니다.
  const when = entry.time ?? (entry.band === "unknown" ? null : TIME_BAND_LABEL[entry.band]);

  return (
    <button
      type="button"
      onClick={onPick}
      title={`${entry.department} ${entry.name} · ${entry.rank}순위 · ${entry.raw}${
        entry.hrOnly ? " · 인사책임자와 면담 희망" : ""
      }`}
      className={`block w-full rounded px-2 py-1.5 text-left text-xs font-semibold leading-tight transition hover:brightness-95 ${
        active ? "ring-2 ring-brand ring-offset-1" : ""
      }`}
      style={{ background: tone.bg, color: tone.ink }}
    >
      <span className="block truncate">{entry.name}</span>
      <span className="mt-0.5 block truncate text-[11px] font-normal opacity-75">
        {entry.confirmed ? "확정" : `${entry.rank}순위`}{when ? ` · ${when}` : ""}
      </span>
    </button>
  );
}
