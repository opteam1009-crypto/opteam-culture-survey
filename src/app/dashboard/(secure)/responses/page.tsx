import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { QUESTION_BY_CODE } from "@/lib/questions";
import { formatScore, scoreTone } from "@/lib/score";
import { loadTextAnswers, loadVisibleResponses } from "@/lib/queries";
import { VISIBILITY_LABEL } from "@/lib/mail";
import DeleteResponseButton from "@/components/DeleteResponseButton";

export const dynamic = "force-dynamic";

export default async function ResponsesPage({
  searchParams,
}: {
  searchParams: { period?: string; dept?: string; view?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const all = await loadVisibleResponses(session.role);
  const periods = [...new Set(all.map((r) => r.period))].sort().reverse();
  const depts = [...new Set(all.map((r) => r.department_name))].sort();

  const period = searchParams.period && periods.includes(searchParams.period) ? searchParams.period : "";
  const dept = searchParams.dept && depts.includes(searchParams.dept) ? searchParams.dept : "";
  const view = searchParams.view === "text" ? "text" : "list";

  const rows = all.filter(
    (r) => (!period || r.period === period) && (!dept || r.department_name === dept),
  );

  const texts = view === "text" ? await loadTextAnswers(session.role, period || undefined) : [];
  const filteredTexts = dept ? texts.filter((t) => t.department === dept) : texts;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">응답 열람</h1>
        <p className="mt-1 text-sm text-muted">
          {ROLE_LABEL[session.role]} 계정에 공개된 응답만 표시됩니다. 응답자가 열람 범위를 다르게
          지정한 응답은 목록과 집계 모두에서 제외됩니다.
        </p>
      </header>

      <div className="card p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="view" value={view} />
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-muted">회차</span>
            <select name="period" defaultValue={period} className="field w-auto py-1.5 text-sm">
              <option value="">전체</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-muted">부서</span>
            <select name="dept" defaultValue={dept} className="field w-auto py-1.5 text-sm">
              <option value="">전체</option>
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-ghost py-2 text-sm">
            적용
          </button>
          <div className="ml-auto flex gap-1 rounded-lg border border-line p-0.5">
            <TabLink label="응답 목록" active={view === "list"} href={buildHref({ period, dept, view: "list" })} />
            <TabLink label="주관식 모아보기" active={view === "text"} href={buildHref({ period, dept, view: "text" })} />
          </div>
        </form>
      </div>

      {view === "list" ? (
        <section className="card overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">조건에 맞는 응답이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-gray-50 text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-semibold">제출자</th>
                    <th className="px-4 py-2.5 font-semibold">부서</th>
                    <th className="px-4 py-2.5 font-semibold">회차</th>
                    <th className="px-4 py-2.5 font-semibold">종합 점수</th>
                    <th className="px-4 py-2.5 font-semibold">열람 범위</th>
                    <th className="px-4 py-2.5 font-semibold">제출 시각</th>
                    <th className="px-4 py-2.5 text-right font-semibold">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const tone = scoreTone(row.overall_score);
                    return (
                      <tr key={row.id} className="border-b border-line/60 transition hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/dashboard/responses/${row.id}`} className="text-brand hover:underline">
                            {row.respondent_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted">{row.department_name}</td>
                        <td className="px-4 py-3 tabular-nums text-muted">{formatPeriod(row.period)}</td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: tone.bg, color: tone.ink }}
                          >
                            {tone.label} {formatScore(row.overall_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">
                          {VISIBILITY_LABEL[row.visibility] ?? row.visibility}
                        </td>
                        <td className="px-4 py-3 text-xs tabular-nums text-muted">
                          {formatDateTime(row.submitted_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DeleteResponseButton
                            id={row.id}
                            name={row.respondent_name}
                            period={formatPeriod(row.period)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {filteredTexts.length === 0 ? (
            <div className="card px-6 py-10 text-center text-sm text-muted">
              조건에 맞는 주관식 응답이 없습니다.
            </div>
          ) : (
            filteredTexts.map((item, index) => (
              <article key={`${item.responseId}-${item.questionCode}-${index}`} className="card p-5">
                <p className="text-xs font-semibold text-brand">
                  {QUESTION_BY_CODE.get(item.questionCode)?.prompt ?? item.questionCode}
                </p>
                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed">{item.text}</p>
                <p className="mt-3 text-xs text-muted">
                  {item.department} · {item.name} ·{" "}
                  <Link href={`/dashboard/responses/${item.responseId}`} className="text-brand hover:underline">
                    응답 전체 보기
                  </Link>{" "}
                  · {formatDateTime(item.submittedAt)}
                </p>
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}

function buildHref({ period, dept, view }: { period: string; dept: string; view: string }) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (dept) params.set("dept", dept);
  params.set("view", view);
  return `/dashboard/responses?${params.toString()}`;
}

function TabLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand text-white" : "text-muted hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
