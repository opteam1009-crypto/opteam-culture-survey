import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import {
  QUESTION_BY_CODE,
  SCORED_SECTION_CODES,
  SECTIONS,
  questionsOfSection,
  scaleLabelsFor,
} from "@/lib/questions";
import { formatScore, scoreTone } from "@/lib/score";
import { loadResponseDetail } from "@/lib/queries";
import { VISIBILITY_LABEL } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function ResponseDetailPage({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const detail = await loadResponseDetail(session.role, params.id).catch(() => null);
  if (!detail) notFound();

  const byCode = new Map(detail.answers.map((a) => [a.question_code, a]));
  const tone = scoreTone(detail.overall_score);

  return (
    <div className="space-y-5">
      <Link href="/dashboard/responses" className="text-xs font-semibold text-brand">
        ← 응답 목록
      </Link>

      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">
              {detail.respondent_name}
              <span className="ml-2 text-base font-medium text-muted">{detail.department_name}</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {formatPeriod(detail.period)} · {formatDateTime(detail.submitted_at)} 제출 · 열람 범위{" "}
              {VISIBILITY_LABEL[detail.visibility] ?? detail.visibility}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold leading-none">{formatScore(detail.overall_score)}</p>
            <span
              className="mt-2 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ background: tone.bg, color: tone.ink }}
            >
              {tone.label}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {SECTIONS.filter((s: { code: string }) => SCORED_SECTION_CODES.includes(s.code)).map((section) => {
            const score = detail.section_scores[section.code] ?? null;
            const sectionTone = scoreTone(score);
            return (
              <div key={section.code} className="rounded-lg border border-line px-3 py-2.5">
                <p className="truncate text-[11px] text-muted">{section.label}</p>
                <p className="mt-0.5 text-lg font-bold leading-tight tabular-nums">
                  {formatScore(score)}
                </p>
                <span className="text-[10px] font-semibold" style={{ color: sectionTone.ink }}>
                  {sectionTone.label}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {SECTIONS.map((section) => {
        const questions = questionsOfSection(section.code);
        const answered = questions.filter((q) => {
          const a = byCode.get(q.code);
          return a && (a.value_num !== null || (a.value_text ?? "").trim() !== "");
        });
        if (answered.length === 0) return null;

        return (
          <section key={section.code} className="card p-6">
            <h2 className="text-base font-bold">{section.label}</h2>
            <ul className="mt-3 divide-y divide-line">
              {answered.map((question) => {
                const answer = byCode.get(question.code);
                if (!answer) return null;
                return (
                  <li key={question.code} className="py-3">
                    <p className="text-sm leading-relaxed">{question.prompt}</p>
                    {answer.value_num !== null ? (
                      <p className="mt-1.5 text-sm font-semibold text-brand">
                        {answerLabel(question.code, answer.value_num)}
                      </p>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-relaxed">
                        {answer.value_text}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** 척도 문항은 "4점 · 그렇다", 선택형 문항은 보기 문구를 그대로 보여줍니다. */
function answerLabel(code: string, value: number): string {
  const question = QUESTION_BY_CODE.get(code);
  if (!question) return String(value);
  if (question.type === "choice") {
    return question.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  const label = scaleLabelsFor(question.sectionCode).find((l) => l.value === value)?.label;
  return label ? `${value}점 · ${label}` : `${value}점`;
}
