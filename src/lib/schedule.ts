/**
 * 면담 희망 일시는 자유 입력이라 형식이 제각각입니다.
 * "8월 12일(수) 14시 이후", "화요일 오후", "9/3 오전" 같은 표현에서
 * 잡아낼 수 있는 것만 잡아내고, 못 잡으면 못 잡았다고 표시합니다.
 * 억지로 추측해 엉뚱한 날짜에 배치하는 것보다 낫습니다.
 */

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export type TimeBand = "morning" | "afternoon" | "evening" | "unknown";

export const TIME_BAND_LABEL: Record<TimeBand, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
  unknown: "시간 미지정",
};

export interface ParsedSlot {
  /** 'YYYY-MM-DD'. 날짜를 특정할 수 있을 때만 채워집니다. */
  date: string | null;
  /** 0=일 … 6=토. 요일만 적힌 경우에도 채워집니다. */
  weekday: number | null;
  band: TimeBand;
  raw: string;
}

function bandOf(text: string): TimeBand {
  if (/저녁|밤|퇴근\s*후/.test(text)) return "evening";
  if (/오전|아침|am/i.test(text)) return "morning";
  if (/오후|점심|pm/i.test(text)) return "afternoon";
  const hour = text.match(/(\d{1,2})\s*시/);
  if (hour) {
    const h = Number(hour[1]);
    if (h >= 18) return "evening";
    if (h >= 12) return "afternoon";
    if (h >= 6) return "morning";
  }
  return "unknown";
}

function weekdayOf(text: string): number | null {
  const m = text.match(/([일월화수목금토])\s*요일/) ?? text.match(/\(\s*([일월화수목금토])\s*\)/);
  if (!m) return null;
  const index = WEEKDAY_LABELS.indexOf(m[1]);
  return index >= 0 ? index : null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * @param referencePeriod 'YYYY-MM'. 월이 생략된 표현("12일")의 기준이 됩니다.
 */
export function parseSlot(raw: string, referencePeriod: string): ParsedSlot {
  const text = (raw ?? "").trim();
  const band = bandOf(text);
  const weekday = weekdayOf(text);
  const [refYear, refMonth] = referencePeriod.split("-").map(Number);

  let month: number | null = null;
  let day: number | null = null;

  const md = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/) ?? text.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (md) {
    month = Number(md[1]);
    day = Number(md[2]);
  } else {
    const dayOnly = text.match(/(?<!\d)(\d{1,2})\s*일/);
    if (dayOnly) {
      month = refMonth;
      day = Number(dayOnly[1]);
    }
  }

  if (month === null || day === null || month < 1 || month > 12 || day < 1 || day > 31) {
    return { date: null, weekday, band, raw: text };
  }

  // 회차가 12월인데 1월이 적혔다면 다음 해로 봅니다.
  const year = refMonth === 12 && month === 1 ? refYear + 1 : refYear;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1) {
    return { date: null, weekday, band, raw: text };
  }

  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    weekday: probe.getUTCDay(),
    band,
    raw: text,
  };
}

export interface CalendarDay {
  date: string | null;
  day: number;
  weekday: number;
  inMonth: boolean;
  isToday: boolean;
}

/** 월요일 시작의 6주 격자를 만듭니다. */
export function buildMonthGrid(year: number, month: number, today = new Date()): CalendarDay[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  // 월요일이 0이 되도록 회전
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month - 1, 1 - offset));
  const todayKey = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    days.push({
      date: key,
      day: d.getUTCDate(),
      weekday: d.getUTCDay(),
      inMonth: d.getUTCMonth() === month - 1,
      isToday: key === todayKey,
    });
  }
  // 마지막 주가 통째로 다음 달이면 잘라냅니다.
  return days.slice(0, days.slice(35).every((d) => !d.inMonth) ? 35 : 42);
}
