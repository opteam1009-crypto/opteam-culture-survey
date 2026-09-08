import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { loadInterviewRequests, loadVisibleResponses } from "@/lib/queries";
import { WEEKDAY_LABELS, parseSlot } from "@/lib/schedule";
import InterviewCalendar, { type CalendarEntry } from "@/components/InterviewCalendar";

export const dynamic = "force-dynamic";

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: { period?: string; view?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const all = await loadVisibleResponses(session.role);
  const periods = [...new Set(all.map((r) => r.period))].sort().reverse();
  const period =
    searchParams.period && periods.includes(searchParams.period)
      ? searchParams.period
      : (periods[0] ?? "");
  const view = searchParams.view === "list" ? "list" : "calendar";

  const requests = period ? await loadInterviewRequests(session.role, period) : [];

  // 자유 입력에서 읽어낼 수 있는 날짜·요일·시간대를 뽑아 달력에 놓습니다.
  const entries: CalendarEntry[] = requests.flatMap((item) => {
    const base = {
      responseId: item.responseId,
      name: item.name,
      department: item.department,
      riskLevel: item.riskLevel,
      ceoOnly: item.visibility === "ceo_only",
      topic: item.topic,
    };
    const slots: CalendarEntry[] = [];
    if (item.first) {
      slots.push({ ...base, rank: 1, ...parseSlot(item.first, period) });
    }
    if (item.second) {
      slots.push({ ...base, rank: 2, ...parseSlot(item.second, period) });
    }
    return slots;
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">1:1 면담 희망 일시</h1>
          <p className="mt-1 text-sm text-muted">
            {ROLE_LABEL[session.role]} 계정에 공개된 {requests.length}명의 희망 일시입니다.
            🔒 표시는 해당 열람자와만 면담하는 응답자입니다.
          </p>
        </div>
        <div className="flex items-end gap-2">
          {periods.length > 0 && (
            <form method="get" className="flex items-end gap-2">
              <input type="hidden" name="view" value={view} />
              <label className="text-sm">
                <span className="mb-1 block text-xs font-semibold text-muted">회차</span>
                <select name="period" defaultValue={period} className="field w-auto py-1.5 text-sm">
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      {formatPeriod(p)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-ghost py-2 text-sm">
                보기
              </button>
            </form>
          )}
          <div className="flex gap-1 rounded-xl border border-line p-0.5">
            <Tab label="캘린더" active={view === "calendar"} href={`/dashboard/interviews?period=${period}&view=calendar`} />
            <Tab label="목록" active={view === "list"} href={`/dashboard/interviews?period=${period}&view=list`} />
          </div>
        </div>
      </header>

      {requests.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-muted">
          아직 면담 희망 일시를 제출한 응답이 없습니다.
        </div>
      ) : view === "calendar" ? (
        <InterviewCalendar entries={entries} period={period} />
      ) : (
        <section className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-line bg-gray-50 text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-semibold">이름</th>
                  <th className="px-4 py-2.5 font-semibold">부서</th>
                  <th className="px-4 py-2.5 font-semibold">1순위 일시</th>
                  <th className="px-4 py-2.5 font-semibold">2순위 일시</th>
                  <th className="px-4 py-2.5 font-semibold">면담 주제</th>
                  <th className="px-4 py-2.5 font-semibold">면담자</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.responseId} className="border-b border-line/60 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/dashboard/responses/${item.responseId}`}
                        className="text-brand hover:underline"
                      >
                        {item.name}
                      </Link>
                      {item.riskLevel > 0 && (
                        <span
                          className="ml-1.5 rounded px-1 py-0.5 text-[10px] font-semibold"
                          style={
                            item.riskLevel >= 2
                              ? { background: "#fbeaea", color: "#9c2b2b" }
                              : { background: "#fdeee7", color: "#93441f" }
                          }
                        >
                          {item.riskLevel >= 2 ? "확인 필요" : "주의"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{item.department}</td>
                    <td className="px-4 py-3">{formatSlot(item.first, period)}</td>
                    <td className="px-4 py-3 text-muted">{formatSlot(item.second, period)}</td>
                    <td className="px-4 py-3 text-muted">{item.topic || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {item.visibility === "ceo_only"
                        ? "🔒 대표이사"
                        : item.visibility === "hr_only"
                          ? "🔒 인사책임자"
                          : "대표이사 + 인사책임자"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {requests.length > 0 && (
        <p className="text-xs text-muted">
          가장 최근 제출: {formatDateTime(requests[0].submittedAt)}
        </p>
      )}
    </div>
  );
}

function Tab({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand text-white" : "text-muted hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

/** 저장된 값이 'YYYY-MM-DD HH:MM' 이면 읽기 좋게, 옛 자유 입력이면 원문 그대로. */
function formatSlot(value: string, period: string): string {
  if (!value) return "—";
  const parsed = parseSlot(value, period);
  if (!parsed.date) return value;
  const [, mo, d] = parsed.date.split("-").map(Number);
  const weekday = parsed.weekday === null ? "" : ` (${WEEKDAY_LABELS[parsed.weekday]})`;
  const time = value.match(/(\d{2}):(\d{2})$/);
  if (!time) return `${mo}월 ${d}일${weekday}`;
  const hour = Number(time[1]);
  const label = hour < 12 ? "오전" : "오후";
  const display = hour <= 12 ? hour : hour - 12;
  return `${mo}월 ${d}일${weekday} ${label} ${display}:${time[2]}`;
}
