import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { SCORED_SECTION_CODES, SECTIONS } from "@/lib/questions";
import { formatScore, scoreTone } from "@/lib/score";
import { loadResponseDetail } from "@/lib/queries";
import { VISIBILITY_LABEL } from "@/lib/mail";
import ResponseSheet, { type SheetAnswer } from "@/components/ResponseSheet";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ResponseDetailPage({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const detail = await loadResponseDetail(session.role, params.id).catch(() => null);
  if (!detail) notFound();

  const byCode = new Map<string, SheetAnswer>(
    detail.answers.map((a) => [a.question_code, { value_num: a.value_num, value_text: a.value_text }]),
  );
  const tone = scoreTone(detail.overall_score);
  const scoredSections = SECTIONS.filter((s) => SCORED_SECTION_CODES.includes(s.code));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/responses" className="text-xs font-semibold text-brand">
          ← 응답 목록
        </Link>
        <PrintButton />
      </div>

      <header className="card break-inside-avoid p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">
              {detail.respondent_name}
              <span className="ml-2.5 text-lg font-medium text-muted">
                {detail.department_name}
              </span>
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {formatPeriod(detail.period)} · {formatDateTime(detail.submitted_at)} 제출 · 열람 범위{" "}
              {VISIBILITY_LABEL[detail.visibility] ?? detail.visibility}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-semibold text-muted">종합</span>
            <p className="text-4xl font-bold leading-none tabular-nums">
              {formatScore(detail.overall_score)}
            </p>
            <span
              className="rounded-lg px-2.5 py-1 text-sm font-bold"
              style={{ background: tone.bg, color: tone.ink }}
            >
              {tone.label}
            </span>
          </div>
        </div>

        {/* 점수를 매기는 5개 영역. 칸 수를 영역 수와 맞춰 빈칸 없이 고르게 놓습니다. */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
          {scoredSections.map((section) => {
            const score = detail.section_scores[section.code] ?? null;
            const sectionTone = scoreTone(score);
            return (
              <div
                key={section.code}
                className="flex flex-col justify-between rounded-xl border border-line px-4 py-3.5"
              >
                <p className="text-[13px] font-medium leading-snug text-muted">{section.label}</p>
                <p className="mt-2 text-[26px] font-bold leading-none tabular-nums">
                  {formatScore(score)}
                </p>
                <span
                  className="mt-2 inline-block self-start rounded px-1.5 py-0.5 text-xs font-bold"
                  style={{ background: sectionTone.bg, color: sectionTone.ink }}
                >
                  {sectionTone.label}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/*
        문항이 길어 스크롤을 한참 내리면 누구 응답을 보는 중인지 잊게 됩니다.
        요약표 아래에 두어, 화면 위로 올라가는 순간부터 상단에 붙어 따라옵니다.
        sticky 는 조상에 overflow 가 걸리면 동작하지 않으니 이 위치를 유지하세요.
      */}
      <div className="sticky top-0 z-20 rounded-xl border border-line bg-white px-4 py-3 shadow-[0_4px_12px_-4px_rgba(16,24,40,0.18)] print:hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[15px] font-bold">{detail.respondent_name}</span>
          <span className="text-sm font-medium text-muted">{detail.department_name}</span>
          <span className="text-xs text-muted">{formatPeriod(detail.period)}</span>
          <span
            className="ml-auto shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums"
            style={{ background: tone.bg, color: tone.ink }}
          >
            종합 {formatScore(detail.overall_score)} · {tone.label}
          </span>
        </div>
      </div>

      <ResponseSheet answers={byCode} />
    </div>
  );
}
