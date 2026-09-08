import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { VISIBILITY_LABEL } from "@/lib/mail";
import { loadInterviewRequests, loadVisibleResponses } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InterviewsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const all = await loadVisibleResponses(session.role);
  const periods = [...new Set(all.map((r) => r.period))].sort().reverse();
  const period =
    searchParams.period && periods.includes(searchParams.period)
      ? searchParams.period
      : (periods[0] ?? "");

  const requests = period ? await loadInterviewRequests(session.role, period) : [];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">1:1 면담 희망 일시</h1>
          <p className="mt-1 text-sm text-muted">
            {ROLE_LABEL[session.role]} 계정에 공개된 {requests.length}건입니다.
            「대표이사만 열람」을 선택한 응답자는 대표이사와 면담합니다.
          </p>
        </div>
        {periods.length > 0 && (
          <form method="get" className="flex items-end gap-2">
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
      </header>

      {requests.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-muted">
          아직 면담 희망 일시를 제출한 응답이 없습니다.
        </div>
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
                    <td className="px-4 py-3">{item.first || "—"}</td>
                    <td className="px-4 py-3 text-muted">{item.second || "—"}</td>
                    <td className="px-4 py-3 text-muted">{item.topic || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {item.visibility === "ceo_only" ? "🔒 대표이사" : "대표이사 + 인사책임자"}
                      <span className="block text-[11px]">
                        {VISIBILITY_LABEL[item.visibility] ? "" : item.visibility}
                      </span>
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
          제출 시각 기준 최신순입니다. 가장 최근 제출: {formatDateTime(requests[0].submittedAt)}
        </p>
      )}
    </div>
  );
}
