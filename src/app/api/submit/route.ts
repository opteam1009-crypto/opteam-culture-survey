import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { currentPeriod } from "@/lib/period";
import { QUESTION_BY_CODE, SCALE_QUESTIONS, TEXT_QUESTIONS } from "@/lib/questions";
import { computeScores } from "@/lib/score";
import { sendSubmissionNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";

const VALID_VISIBILITY = new Set(["both", "ceo_only", "hr_only"]);
const MAX_TEXT = 2000;
const MAX_NAME = 40;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const body = payload as {
    name?: unknown;
    departmentId?: unknown;
    visibility?: unknown;
    scale?: unknown;
    texts?: unknown;
  };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const departmentId = Number(body.departmentId);
  const visibility = typeof body.visibility === "string" ? body.visibility : "";

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: "성명을 확인해 주세요." }, { status: 400 });
  }
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return NextResponse.json({ error: "소속부서를 선택해 주세요." }, { status: 400 });
  }
  if (!VALID_VISIBILITY.has(visibility)) {
    return NextResponse.json({ error: "열람 범위를 선택해 주세요." }, { status: 400 });
  }

  // 척도 문항: 정의된 문항만 받아들이고 1~5 정수인지 확인합니다.
  const rawScale = (body.scale ?? {}) as Record<string, unknown>;
  const scale: Record<string, number> = {};
  for (const question of SCALE_QUESTIONS) {
    const value = Number(rawScale[question.code]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return NextResponse.json(
        { error: "답변하지 않았거나 잘못된 값이 있는 문항이 있습니다." },
        { status: 400 },
      );
    }
    scale[question.code] = value;
  }

  // 주관식: 정의된 문항만, 길이 제한을 적용해 저장합니다.
  const rawTexts = (body.texts ?? {}) as Record<string, unknown>;
  const texts: Record<string, string> = {};
  for (const question of TEXT_QUESTIONS) {
    const value = rawTexts[question.code];
    if (typeof value === "string" && value.trim()) {
      texts[question.code] = value.trim().slice(0, MAX_TEXT);
    }
  }

  const period = currentPeriod();
  const { overall, sections } = computeScores(scale);
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  try {
    await ensureSchema();
    const q = sql();

    const departments = (await q`
      select id, name from departments where id = ${departmentId} and active = true
    `) as { id: number; name: string }[];
    const department = departments[0];
    if (!department) {
      return NextResponse.json({ error: "선택한 소속부서를 찾을 수 없습니다." }, { status: 400 });
    }

    const inserted = (await q`
      insert into survey_responses
        (period, respondent_name, department_id, department_name, visibility, overall_score, section_scores, user_agent)
      values
        (${period}, ${name}, ${department.id}, ${department.name}, ${visibility}, ${overall},
         ${JSON.stringify(sections)}::jsonb, ${userAgent})
      returning id, submitted_at
    `) as { id: string; submitted_at: string }[];

    const response = inserted[0];

    for (const [code, value] of Object.entries(scale)) {
      await q`insert into survey_answers (response_id, question_code, value_num)
              values (${response.id}, ${code}, ${value})`;
    }
    for (const [code, value] of Object.entries(texts)) {
      if (!QUESTION_BY_CODE.has(code)) continue;
      await q`insert into survey_answers (response_id, question_code, value_text)
              values (${response.id}, ${code}, ${value})`;
    }

    // 알림 발송은 실패해도 제출을 되돌리지 않습니다. 내용은 notification_log 에 남습니다.
    await sendSubmissionNotification({
      responseId: response.id,
      name,
      department: department.name,
      period,
      visibility,
      overallScore: overall,
      submittedAt: new Date(response.submitted_at),
      dashboardUrl: dashboardUrl(request),
    });

    return NextResponse.json({ ok: true, period });
  } catch (err) {
    console.error("[submit] failed", err);
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

function dashboardUrl(request: Request): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/dashboard`;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}/dashboard`;
  return new URL("/dashboard", request.url).toString();
}
