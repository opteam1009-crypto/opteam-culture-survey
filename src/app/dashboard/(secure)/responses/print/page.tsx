import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { formatPeriod } from "@/lib/period";
import { loadAnswersForResponses, loadVisibleResponses } from "@/lib/queries";
import ResponseSheet, { type SheetAnswer } from "@/components/ResponseSheet";
import ResponseSummary from "@/components/ResponseSummary";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/**
 * 여러 명을 한 번에 인쇄(PDF 저장)하는 화면.
 * 응답 목록에서 걸어둔 회차·부서 조건을 그대로 물려받아, 보이는 그 범위만 나옵니다.
 * 한 사람이 끝나면 다음 사람은 새 장에서 시작합니다.
 */
export default async function ResponsesPrintPage({
  searchParams,
}: {
  searchParams: { period?: string; dept?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const all = await loadVisibleResponses(session.role);
  const periods = [...new Set(all.map((r) => r.period))];
  const depts = [...new Set(all.map((r) => r.department_name))];

  const period = searchParams.period && periods.includes(searchParams.period) ? searchParams.period : "";
  const dept = searchParams.dept && depts.includes(searchParams.dept) ? searchParams.dept : "";

  // 오래된 사람부터 놓아야 종이로 넘길 때 순서가 자연스럽습니다.
  const rows = all
    .filter((r) => (!period || r.period === period) && (!dept || r.department_name === dept))
    .reverse();

  const answers = await loadAnswersForResponses(rows.map((r) => r.id));

  const scope = [period ? formatPeriod(period) : "전체 회차", dept || "전체 부서"].join(" · ");
  const backHref = `/dashboard/responses${
    period || dept
      ? `?${new URLSearchParams({ ...(period && { period }), ...(dept && { dept }) }).toString()}`
      : ""
  }`;

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5 print:hidden">
        <div className="min-w-0">
          <h1 className="text-base font-bold">
            {scope} · {rows.length}명 인쇄
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {ROLE_LABEL[session.role]} 계정으로 열람 가능한 응답만 들어갑니다. 한 사람당 3~4장,
            모두 <b className="text-ink">{rows.length * 4}장</b> 안팎이고 사람마다 새 장에서
            시작합니다. 아래 미리보기에는 1~5 보기 칸이 보이지만 인쇄본에서는 빠지고 고른 답만
            남습니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={backHref} className="btn-ghost px-3 py-1.5 text-xs">
            ← 목록으로
          </Link>
          <PrintButton />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm text-muted print:hidden">
          조건에 맞는 응답이 없습니다.
        </p>
      ) : (
        rows.map((row, index) => (
          <section
            key={row.id}
            // 두 번째 사람부터는 새 장에서 시작합니다.
            className={`space-y-5 ${index > 0 ? "print:break-before-page" : ""}`}
          >
            <ResponseSummary detail={row} />
            <ResponseSheet answers={toSheet(answers.get(row.id))} />
          </section>
        ))
      )}
    </div>
  );
}

function toSheet(
  rows: { question_code: string; value_num: number | null; value_text: string | null }[] | undefined,
): Map<string, SheetAnswer> {
  return new Map(
    (rows ?? []).map((a) => [a.question_code, { value_num: a.value_num, value_text: a.value_text }]),
  );
}
