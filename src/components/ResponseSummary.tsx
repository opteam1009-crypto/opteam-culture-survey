/**
 * 응답 1건의 머리말 — 이름·부서·회차·종합 점수·영역별 점수.
 * 상세 화면과 여러 명 인쇄 화면이 같은 모양이어야 해서 한 곳에 둡니다.
 */
import { SCORED_SECTION_CODES, SECTIONS } from "@/lib/questions";
import { formatScore, scoreTone } from "@/lib/score";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { VISIBILITY_LABEL } from "@/lib/mail";

const SCORED_SECTIONS = SECTIONS.filter((s) => SCORED_SECTION_CODES.includes(s.code));

export interface SummaryResponse {
  respondent_name: string;
  department_name: string;
  period: string;
  visibility: string;
  submitted_at: string;
  overall_score: number | null;
  section_scores: Record<string, number>;
}

export default function ResponseSummary({ detail }: { detail: SummaryResponse }) {
  const tone = scoreTone(detail.overall_score);

  return (
    <header className="card break-inside-avoid p-7 print:p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            {detail.respondent_name}
            <span className="ml-2.5 text-lg font-medium text-muted">{detail.department_name}</span>
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
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:mt-4 print:grid-cols-5 print:gap-2">
        {SCORED_SECTIONS.map((section) => {
          const score = detail.section_scores[section.code] ?? null;
          const sectionTone = scoreTone(score);
          return (
            <div
              key={section.code}
              className="flex flex-col justify-between rounded-xl border border-line px-4 py-3.5 print:px-3 print:py-2.5"
            >
              <p className="text-[13px] font-medium leading-snug text-muted">{section.label}</p>
              <p className="mt-2 text-[26px] font-bold leading-none tabular-nums print:mt-1.5 print:text-xl">
                {formatScore(score)}
              </p>
              <span
                className="mt-2 inline-block self-start rounded px-1.5 py-0.5 text-xs font-bold print:mt-1"
                style={{ background: sectionTone.bg, color: sectionTone.ink }}
              >
                {sectionTone.label}
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
