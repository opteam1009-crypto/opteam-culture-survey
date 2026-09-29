import { GRIEVANCE_DEADLINE_DAYS, type ConfidentialReport } from "@/lib/confidential";

/** 고충 처리 기한 표시. 끝난 건과 괴롭힘 신고에는 붙이지 않습니다. */
export default function ReportDeadline({ r }: { r: ConfidentialReport }) {
  if (r.kind !== "grievance" || r.status === "done") return null;
  const passed = daysSince(r.submitted_at);
  const left = GRIEVANCE_DEADLINE_DAYS - passed;
  const late = left < 0;
  const near = left <= 3;
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
      style={
        late
          ? { background: "#fbeaea", color: "#9c2b2b" }
          : near
            ? { background: "#fdeee7", color: "#93441f" }
            : { background: "#f0efec", color: "#52514e" }
      }
    >
      {late ? `기한 ${-left}일 초과` : left === 0 ? "오늘까지 통보" : `통보 기한 D-${left}`}
    </span>
  );
}

/** 접수 후 며칠째인지(한국 날짜 기준). */
export function daysSince(iso: string): number {
  const toDay = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
  const a = new Date(toDay(new Date(iso)));
  const b = new Date(toDay(new Date()));
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

