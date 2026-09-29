import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { currentPeriod } from "@/lib/period";
import {
  MAX_BODY,
  MAX_NAME,
  MAX_TITLE,
  SUGGESTION_FIELDS,
  VALID_TOPICS,
} from "@/lib/suggestions";
import { sendSuggestionNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** 성장 제안 접수(공개). */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const departmentId = Number(body.departmentId);
  const topic = typeof body.topic === "string" ? body.topic : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: "성명을 확인해 주세요." }, { status: 400 });
  }
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    return NextResponse.json({ error: "소속 부서를 선택해 주세요." }, { status: 400 });
  }
  if (!VALID_TOPICS.has(topic)) {
    return NextResponse.json({ error: "제안 주제를 선택해 주세요." }, { status: 400 });
  }
  if (!title || title.length > MAX_TITLE) {
    return NextResponse.json({ error: "한 줄 제목을 확인해 주세요." }, { status: 400 });
  }

  // 현황·제안·기대효과는 셋 다 있어야 합니다. 하나만 적힌 제안은 검토할 수가
  // 없고, 결국 제안자에게 되물어야 해서 회신이 늦어집니다.
  const text: Record<string, string> = {};
  for (const field of SUGGESTION_FIELDS) {
    const raw = body[field.code];
    const value = typeof raw === "string" ? raw.trim().slice(0, MAX_BODY) : "";
    if (!value) {
      return NextResponse.json(
        { error: `「${field.label}」 칸을 채워 주세요.` },
        { status: 400 },
      );
    }
    text[field.code] = value;
  }

  const period = currentPeriod();
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  try {
    await ensureSchema();
    const q = sql();

    const departments = (await q`
      select id, name from departments where id = ${departmentId} and active = true
    `) as { id: number; name: string }[];
    const department = departments[0];
    if (!department) {
      return NextResponse.json({ error: "선택한 소속 부서를 찾을 수 없습니다." }, { status: 400 });
    }

    const inserted = (await q`
      insert into suggestions
        (period, proposer_name, department_id, department_name, topic, title,
         situation, proposal, expect, user_agent)
      values
        (${period}, ${name}, ${department.id}, ${department.name}, ${topic}, ${title},
         ${text.situation}, ${text.proposal}, ${text.expect}, ${userAgent})
      returning id, submitted_at
    `) as { id: string; submitted_at: string }[];

    // 알림이 실패해도 접수를 되돌리지 않습니다. 내용은 notification_log 에 남습니다.
    await sendSuggestionNotification({
      id: inserted[0].id,
      name,
      department: department.name,
      topic,
      title,
      situation: text.situation,
      proposal: text.proposal,
      expect: text.expect,
      dashboardUrl: suggestionsUrl(request),
    });

    return NextResponse.json({ ok: true, id: inserted[0].id });
  } catch (err) {
    console.error("[suggestions] failed", err);
    return NextResponse.json(
      { error: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

function suggestionsUrl(request: Request): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/dashboard/suggestions`;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}/dashboard/suggestions`;
  return new URL("/dashboard/suggestions", request.url).toString();
}
