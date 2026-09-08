const SEOUL = "Asia/Seoul";

/** 'YYYY-MM' 형식의 회차 문자열. 기준 시각은 한국 시간입니다. */
export function currentPeriod(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/** '2026-09' → '2026년 9월' */
export function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  if (!y || !m) return period;
  return `${y}년 ${Number(m)}월`;
}

/** '2026-09' → '9월' (차트 축처럼 좁은 자리에 씁니다) */
export function shortPeriod(period: string): string {
  const [, m] = period.split("-");
  return m ? `${Number(m)}월` : period;
}

/** 해당 회차 직전 달. */
export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  const date = new Date(Date.UTC(y, m - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * 설문이 묻는 "지난 한 달"이 실제로 어느 달인지 계산합니다.
 * 9월에 제출하는 회차는 8월을 평가합니다. 회차 이름과 평가 대상이 다르므로
 * 응답자가 헷갈리지 않도록 화면에 직접 적어줍니다.
 */
export function targetMonthLabel(period: string): string {
  return formatPeriod(previousPeriod(period));
}

/** '2026년 8월 1일 ~ 8월 31일' */
export function targetRangeLabel(period: string): string {
  const prev = previousPeriod(period);
  const [y, m] = prev.split("-").map(Number);
  if (!y || !m) return formatPeriod(prev);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}년 ${m}월 1일 ~ ${m}월 ${lastDay}일`;
}
