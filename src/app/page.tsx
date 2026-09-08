import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import SurveyForm, { type DepartmentOption } from "@/components/SurveyForm";
import { ensureSchema, hasDatabaseUrl, sql } from "@/lib/db";
import { currentPeriod, formatPeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: { preview?: string };
}) {
  // 대시보드에 로그인한 상태라면 설문지를 다시 볼 이유가 없으므로 바로 넘깁니다.
  // 설문 화면을 확인해야 할 때는 ?preview=1 로 들어옵니다.
  if (searchParams.preview !== "1") {
    let session = null;
    try {
      session = await readSession();
    } catch {
      session = null;
    }
    if (session) redirect("/dashboard");
  }

  const period = currentPeriod();
  const periodLabel = formatPeriod(period);

  if (!hasDatabaseUrl()) return <SetupNotice />;

  let departments: DepartmentOption[] = [];
  try {
    await ensureSchema();
    departments = (await sql()`
      select id, name from departments where active = true order by sort_order, name
    `) as DepartmentOption[];
  } catch (err) {
    return <SetupNotice detail={err instanceof Error ? err.message : String(err)} />;
  }

  const isPreview = searchParams.preview === "1";

  return (
    <main className="mx-auto max-w-3xl px-5 pb-10 pt-8 sm:pt-12">
      {isPreview && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          <span aria-hidden>👁</span>
          미리보기입니다. 이 화면에서 제출하면 실제 응답으로 저장되니 주의하세요.
        </p>
      )}

      {/* ── 표지 ───────────────────────────────────────────── */}
      <header className="card mb-4 overflow-hidden">
        <div className="relative bg-gradient-to-br from-brand via-[#24589f] to-accent px-7 py-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              Monthly Organization Condition Survey
            </p>
            <Link
              href="/dashboard"
              className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              {isPreview ? "← 대시보드" : "관리자"}
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/75">지난 한 달, 회사생활 어떠셨나요?</p>
          <h1 className="mt-1.5 text-[26px] font-bold leading-tight sm:text-[30px]">
            {periodLabel} 조직 컨디션 설문
          </h1>
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-white/70">
            <li>평가 대상 기간 · 지난 한 달</li>
            <li>소요시간 · 약 3~5분</li>
            <li>열람 · 대표이사와 인사책임자</li>
          </ul>
        </div>

        <div className="divide-y divide-line">
          <Notice icon="💬">
            이 설문은 직원 개인을 평가하기 위한 것이 아니라, 회사의 업무환경·소통·리더십·조직문화를
            개선하기 위한 월간 설문입니다. 지난 한 달을 돌아보며 솔직하게 답변해 주세요.{" "}
            <b className="text-ink">인사평가와는 무관합니다.</b>
          </Notice>
          <Notice icon="🔒">
            응답 내용은 본인이 선택한 열람자만 확인하며, 인사평가 등 다른 목적으로는 절대 사용되지
            않습니다. <b className="text-ink">솔직한 응답으로 인한 불이익은 일절 없습니다.</b>
          </Notice>
        </div>
      </header>

      <SurveyForm departments={departments} periodLabel={periodLabel} />
    </main>
  );
}

function Notice({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-3 px-7 py-4 text-[13px] leading-relaxed text-muted">
      <span aria-hidden className="shrink-0 text-base leading-none">
        {icon}
      </span>
      <span>{children}</span>
    </p>
  );
}

function SetupNotice({ detail }: { detail?: string }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <div className="card p-7">
        <h1 className="text-lg font-bold">설정이 아직 완료되지 않았습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          데이터베이스 연결이 없어 설문을 표시할 수 없습니다. Vercel 프로젝트에서{" "}
          <b className="text-ink">Storage → Neon</b> 을 연결하거나 <code>DATABASE_URL</code>{" "}
          환경변수를 설정한 뒤 다시 배포해 주세요.
        </p>
        {detail && (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-muted">
            {detail}
          </pre>
        )}
      </div>
    </main>
  );
}
