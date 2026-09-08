import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { ensureSchema, rawQuery, sql } from "@/lib/db";
import { buildDemoResponses } from "@/lib/demo";

export const dynamic = "force-dynamic";
// 6회차 분량을 한 번에 넣으므로 기본 제한(10초)보다 여유를 둡니다.
export const maxDuration = 60;

async function requireSession() {
  try {
    return await readSession();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: unknown };
  const action = body.action;

  try {
    await ensureSchema();

    if (action === "clear") {
      const removed = (await sql()`
        delete from survey_responses where is_demo = true returning id
      `) as { id: string }[];
      return NextResponse.json({ ok: true, removed: removed.length });
    }

    if (action !== "seed") {
      return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
    }

    // 두 번 눌러도 쌓이지 않도록 기존 예시 데이터를 먼저 지웁니다.
    await sql()`delete from survey_responses where is_demo = true`;

    const departments = (await sql()`
      select id, name from departments where active = true order by sort_order, name
    `) as { id: number; name: string }[];
    if (departments.length === 0) {
      return NextResponse.json(
        { error: "부서 목록이 비어 있어 예시 데이터를 만들 수 없습니다." },
        { status: 400 },
      );
    }
    const byName = new Map(departments.map((d) => [d.name, d]));

    const plan = buildDemoResponses();

    // 응답 헤더를 한 번에 넣고 생성된 id 를 받아옵니다.
    const responseValues: unknown[] = [];
    const responseRows: string[] = [];
    plan.forEach((item, index) => {
      const dept = byName.get(item.department) ?? departments[index % departments.length];
      const base = index * 9;
      responseRows.push(
        `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8}::jsonb,$${base + 9},true)`,
      );
      responseValues.push(
        item.period,
        item.name,
        dept.id,
        dept.name,
        item.visibility,
        item.riskLevel,
        item.overall,
        JSON.stringify(item.sections),
        item.submittedAt.toISOString(),
      );
    });

    const inserted = await rawQuery(
      `insert into survey_responses
         (period, respondent_name, department_id, department_name, visibility,
          risk_level, overall_score, section_scores, submitted_at, is_demo)
       values ${responseRows.join(",")}
       returning id`,
      responseValues,
    );

    // 답변은 행 수가 많으므로 나눠서 대량 INSERT 합니다.
    const answerTuples: { responseId: string; code: string; num: number | null; text: string | null }[] = [];
    plan.forEach((item, index) => {
      const responseId = inserted[index].id as string;
      for (const [code, value] of Object.entries(item.numeric)) {
        answerTuples.push({ responseId, code, num: value, text: null });
      }
      for (const [code, value] of Object.entries(item.texts)) {
        answerTuples.push({ responseId, code, num: null, text: value });
      }
    });

    const CHUNK = 400;
    for (let i = 0; i < answerTuples.length; i += CHUNK) {
      const chunk = answerTuples.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const rows = chunk.map((tuple, j) => {
        const base = j * 4;
        values.push(tuple.responseId, tuple.code, tuple.num, tuple.text);
        return `($${base + 1}::uuid,$${base + 2},$${base + 3},$${base + 4})`;
      });
      await rawQuery(
        `insert into survey_answers (response_id, question_code, value_num, value_text)
         values ${rows.join(",")}`,
        values,
      );
    }

    return NextResponse.json({
      ok: true,
      responses: plan.length,
      answers: answerTuples.length,
      periods: [...new Set(plan.map((p) => p.period))].sort(),
    });
  } catch (err) {
    console.error("[demo]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message.slice(0, 300) : "예시 데이터 작업에 실패했습니다." },
      { status: 500 },
    );
  }
}
