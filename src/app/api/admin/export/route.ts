import { NextResponse } from "next/server";
import { readSession, ROLE_LABEL } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { VISIBLE_TO } from "@/lib/auth";
import { QUESTIONS, SECTIONS } from "@/lib/questions";
import { VISIBILITY_LABEL } from "@/lib/mail";
import { formatDateTime } from "@/lib/period";

export const dynamic = "force-dynamic";

const SCORED_SECTIONS = SECTIONS.filter((s) => s.code !== "open");

export async function GET(request: Request) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const period = new URL(request.url).searchParams.get("period");

  await ensureSchema();
  const responses = (await sql()`
    select id, period, respondent_name, department_name, visibility, overall_score,
           section_scores, submitted_at
      from survey_responses
     where visibility = any(${VISIBLE_TO[session.role]})
       and (${period}::text is null or period = ${period})
     order by submitted_at desc
  `) as {
    id: string;
    period: string;
    respondent_name: string;
    department_name: string;
    visibility: string;
    overall_score: string | null;
    section_scores: Record<string, number>;
    submitted_at: string;
  }[];

  const answers = (await sql()`
    select a.response_id, a.question_code, a.value_num, a.value_text
      from survey_answers a
      join survey_responses r on r.id = a.response_id
     where r.visibility = any(${VISIBLE_TO[session.role]})
       and (${period}::text is null or r.period = ${period})
  `) as {
    response_id: string;
    question_code: string;
    value_num: number | null;
    value_text: string | null;
  }[];

  const byResponse = new Map<string, Map<string, string>>();
  for (const answer of answers) {
    let bucket = byResponse.get(answer.response_id);
    if (!bucket) {
      bucket = new Map();
      byResponse.set(answer.response_id, bucket);
    }
    bucket.set(
      answer.question_code,
      answer.value_num !== null ? String(answer.value_num) : (answer.value_text ?? ""),
    );
  }

  const header = [
    "회차",
    "제출자",
    "소속부서",
    "열람범위",
    "종합점수",
    ...SCORED_SECTIONS.map((s) => `${s.label} 점수`),
    ...QUESTIONS.map((q) => q.prompt),
    "제출시각",
  ];

  const lines = [header.map(csvCell).join(",")];
  for (const row of responses) {
    const bucket = byResponse.get(row.id) ?? new Map<string, string>();
    lines.push(
      [
        row.period,
        row.respondent_name,
        row.department_name,
        VISIBILITY_LABEL[row.visibility] ?? row.visibility,
        row.overall_score ?? "",
        ...SCORED_SECTIONS.map((s) => row.section_scores?.[s.code] ?? ""),
        ...QUESTIONS.map((q) => bucket.get(q.code) ?? ""),
        formatDateTime(row.submitted_at),
      ]
        .map(csvCell)
        .join(","),
    );
  }

  const filename = `사내진단_${period ?? "전체"}_${ROLE_LABEL[session.role]}.csv`;
  // Excel 이 UTF-8 로 인식하도록 BOM 을 붙입니다.
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // 선행 =,+,-,@ 는 스프레드시트에서 수식으로 해석될 수 있어 앞에 작은따옴표를 붙입니다.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
