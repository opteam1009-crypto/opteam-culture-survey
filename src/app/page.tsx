import Link from "next/link";
import SurveyForm, { type DepartmentOption } from "@/components/SurveyForm";
import { ensureSchema, hasDatabaseUrl, sql } from "@/lib/db";
import { currentPeriod, formatPeriod } from "@/lib/period";
import { SCALE_QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const period = currentPeriod();
  const periodLabel = formatPeriod(period);

  if (!hasDatabaseUrl()) {
    return <SetupNotice />;
  }

  let departments: DepartmentOption[] = [];
  try {
    await ensureSchema();
    departments = (await sql()`
      select id, name from departments where active = true order by sort_order, name
    `) as DepartmentOption[];
  } catch (err) {
    return <SetupNotice detail={err instanceof Error ? err.message : String(err)} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-7">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            {periodLabel} 정기 진단
          </p>
          <Link
            href="/dashboard"
            className="shrink-0 text-xs text-muted/70 transition hover:text-muted"
          >
            관리자
          </Link>
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-snug">사내 업무환경·소통 진단</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          더 나은 업무 환경을 만들기 위해 매월 진행하는 설문입니다. 정답이 있는 조사가 아니니
          평소 느끼신 그대로 응답해 주시면 됩니다. 필수 문항 {SCALE_QUESTIONS.length}개, 약 5분
          정도 걸립니다.
        </p>
      </header>

      <SurveyForm departments={departments} period={period} periodLabel={periodLabel} />
    </main>
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
