import { ensureSchema, sql } from "@/lib/db";
import { VISIBLE_TO, type Role } from "@/lib/auth";
import { SCALE_QUESTIONS, SECTIONS } from "@/lib/questions";
import { meanOf, toHundred } from "@/lib/score";

export interface ResponseRow {
  id: string;
  period: string;
  respondent_name: string;
  department_id: number | null;
  department_name: string;
  visibility: string;
  overall_score: number | null;
  section_scores: Record<string, number>;
  submitted_at: string;
}

export interface DepartmentRow {
  id: number;
  name: string;
  sort_order: number;
  active: boolean;
  response_count: number;
}

/**
 * 역할이 열람 가능한 응답만 가져옵니다. 집계와 목록 모두 이 결과를 기준으로 하므로
 * 대표이사 계정과 인사책임자 계정의 숫자가 서로 다를 수 있습니다.
 * 이는 응답자에게 약속한 열람 범위를 집계에서도 지키기 위한 의도된 동작입니다.
 */
export async function loadVisibleResponses(role: Role): Promise<ResponseRow[]> {
  await ensureSchema();
  const rows = (await sql()`
    select id, period, respondent_name, department_id, department_name, visibility,
           overall_score, section_scores, submitted_at
      from survey_responses
     where visibility = any(${VISIBLE_TO[role]})
     order by submitted_at desc
  `) as ResponseRow[];

  return rows.map((row) => ({
    ...row,
    overall_score: row.overall_score === null ? null : Number(row.overall_score),
    section_scores: normalizeSectionScores(row.section_scores),
  }));
}

function normalizeSectionScores(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export async function loadDepartments(): Promise<DepartmentRow[]> {
  await ensureSchema();
  return (await sql()`
    select d.id, d.name, d.sort_order, d.active,
           coalesce(count(r.id), 0)::int as response_count
      from departments d
      left join survey_responses r on r.department_id = d.id
     group by d.id
     order by d.sort_order, d.name
  `) as DepartmentRow[];
}

// ── 집계 ────────────────────────────────────────────────────────────────

export interface PeriodSummary {
  period: string;
  count: number;
  overall: number | null;
  sections: Record<string, number | null>;
}

/** 회차별 요약을 오래된 순으로 반환합니다(추이 차트용). */
export function summarizeByPeriod(rows: ResponseRow[]): PeriodSummary[] {
  const byPeriod = new Map<string, ResponseRow[]>();
  for (const row of rows) {
    const bucket = byPeriod.get(row.period);
    if (bucket) bucket.push(row);
    else byPeriod.set(row.period, [row]);
  }

  return [...byPeriod.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, group]) => ({
      period,
      count: group.length,
      overall: roundOrNull(meanOf(group.map((r) => r.overall_score ?? NaN))),
      sections: Object.fromEntries(
        SECTIONS.filter((s) => s.code !== "open").map((section) => [
          section.code,
          roundOrNull(meanOf(group.map((r) => r.section_scores[section.code] ?? NaN))),
        ]),
      ),
    }));
}

export interface DepartmentSummary {
  name: string;
  count: number;
  overall: number | null;
  sections: Record<string, number | null>;
}

export function summarizeByDepartment(rows: ResponseRow[]): DepartmentSummary[] {
  const byDept = new Map<string, ResponseRow[]>();
  for (const row of rows) {
    const bucket = byDept.get(row.department_name);
    if (bucket) bucket.push(row);
    else byDept.set(row.department_name, [row]);
  }

  return [...byDept.entries()]
    .map(([name, group]) => ({
      name,
      count: group.length,
      overall: roundOrNull(meanOf(group.map((r) => r.overall_score ?? NaN))),
      sections: Object.fromEntries(
        SECTIONS.filter((s) => s.code !== "open").map((section) => [
          section.code,
          roundOrNull(meanOf(group.map((r) => r.section_scores[section.code] ?? NaN))),
        ]),
      ),
    }))
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
}

export function summarizeSections(rows: ResponseRow[]): { code: string; label: string; score: number | null }[] {
  return SECTIONS.filter((s) => s.code !== "open").map((section) => ({
    code: section.code,
    label: section.label,
    score: roundOrNull(meanOf(rows.map((r) => r.section_scores[section.code] ?? NaN))),
  }));
}

export interface QuestionAverage {
  code: string;
  prompt: string;
  sectionLabel: string;
  score: number | null;
  count: number;
}

/** 선택한 회차의 문항별 평균. 응답 건수가 0이면 빈 배열입니다. */
export async function loadQuestionAverages(
  role: Role,
  period: string,
): Promise<QuestionAverage[]> {
  await ensureSchema();
  const rows = (await sql()`
    select a.question_code, avg(a.value_num)::float as mean, count(*)::int as n
      from survey_answers a
      join survey_responses r on r.id = a.response_id
     where a.value_num is not null
       and r.period = ${period}
       and r.visibility = any(${VISIBLE_TO[role]})
     group by a.question_code
  `) as { question_code: string; mean: number; n: number }[];

  const byCode = new Map(rows.map((r) => [r.question_code, r]));

  return SCALE_QUESTIONS.map((question) => {
    const hit = byCode.get(question.code);
    return {
      code: question.code,
      prompt: question.prompt,
      sectionLabel:
        SECTIONS.find((s) => s.code === question.sectionCode)?.label ?? question.sectionCode,
      score: hit ? Math.round(toHundred(hit.mean) * 10) / 10 : null,
      count: hit?.n ?? 0,
    };
  }).filter((q) => q.score !== null);
}

export interface TextAnswer {
  responseId: string;
  questionCode: string;
  text: string;
  name: string;
  department: string;
  period: string;
  submittedAt: string;
}

export async function loadTextAnswers(role: Role, period?: string): Promise<TextAnswer[]> {
  await ensureSchema();
  const rows = (await sql()`
    select a.response_id, a.question_code, a.value_text,
           r.respondent_name, r.department_name, r.period, r.submitted_at
      from survey_answers a
      join survey_responses r on r.id = a.response_id
     where a.value_text is not null
       and a.value_text <> ''
       and r.visibility = any(${VISIBLE_TO[role]})
       and (${period ?? null}::text is null or r.period = ${period ?? null})
     order by r.submitted_at desc
  `) as {
    response_id: string;
    question_code: string;
    value_text: string;
    respondent_name: string;
    department_name: string;
    period: string;
    submitted_at: string;
  }[];

  return rows.map((r) => ({
    responseId: r.response_id,
    questionCode: r.question_code,
    text: r.value_text,
    name: r.respondent_name,
    department: r.department_name,
    period: r.period,
    submittedAt: r.submitted_at,
  }));
}

export interface ResponseDetail extends ResponseRow {
  answers: { question_code: string; value_num: number | null; value_text: string | null }[];
}

export async function loadResponseDetail(
  role: Role,
  id: string,
): Promise<ResponseDetail | null> {
  await ensureSchema();
  const rows = (await sql()`
    select id, period, respondent_name, department_id, department_name, visibility,
           overall_score, section_scores, submitted_at
      from survey_responses
     where id = ${id}::uuid
       and visibility = any(${VISIBLE_TO[role]})
  `) as ResponseRow[];

  const response = rows[0];
  if (!response) return null;

  const answers = (await sql()`
    select question_code, value_num, value_text
      from survey_answers
     where response_id = ${id}::uuid
  `) as { question_code: string; value_num: number | null; value_text: string | null }[];

  return {
    ...response,
    overall_score: response.overall_score === null ? null : Number(response.overall_score),
    section_scores: normalizeSectionScores(response.section_scores),
    answers,
  };
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}
