import { NextResponse } from "next/server";
import { ROLE_LABEL, VISIBLE_TO, readSession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { isValidInterviewSlot } from "@/lib/questions";
import { sendInterviewNotification } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * 1:1 면담 일정 관리.
 *
 * 응답자가 적어낸 희망 일시(survey_answers)는 건드리지 않습니다. 관리자가 잡은
 * 확정 일시와 취소 여부만 interview_schedules 에 따로 씁니다. 희망을 덮어쓰면
 * "이 사람이 원래 언제를 원했는지" 가 사라집니다.
 *
 * 대상은 그 계정이 열람할 수 있는 응답으로 제한합니다. 볼 수 없는 사람의 면담을
 * 바꿀 수 있으면 응답자에게 약속한 범위가 무너집니다.
 */
export async function POST(request: Request) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    responseId?: unknown;
    scheduledAt?: unknown;
    rank?: unknown;
  };
  const action = body.action;
  const id = typeof body.responseId === "string" ? body.responseId : "";
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 400 });
  }
  if (
    action !== "confirm" &&
    action !== "cancel" &&
    action !== "reset" &&
    action !== "remove_slot"
  ) {
    return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
  }
  const rank = body.rank === 2 ? 2 : 1;

  const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
  if (action === "confirm" && !isValidInterviewSlot(scheduledAt)) {
    return NextResponse.json(
      { error: "날짜와 시간을 모두 선택해 주세요." },
      { status: 400 },
    );
  }

  try {
    await ensureSchema();
    const q = sql();

    // 이 계정이 볼 수 있는 응답인지 먼저 확인합니다.
    const allowed = (await q`
      select id, respondent_name, department_name from survey_responses
       where id = ${id}::uuid and visibility = any(${VISIBLE_TO[session.role]})
    `) as { id: string; respondent_name: string; department_name: string }[];
    if (allowed.length === 0) {
      return NextResponse.json(
        { error: "이 계정으로는 바꿀 수 없는 면담입니다." },
        { status: 404 },
      );
    }

    // 응답자가 적어낸 희망 일시 두 개 중 고른 하나만 지웁니다.
    // 일정 확정과는 별개로, 못 잡게 된 날짜를 달력에서 치우는 용도입니다.
    if (action === "remove_slot") {
      const code = rank === 2 ? "interview_second" : "interview_first";
      await q`
        delete from survey_answers
         where response_id = ${id}::uuid and question_code = ${code}
      `;
      return NextResponse.json({ ok: true, removed: code });
    }

    if (action === "reset") {
      await q`delete from interview_schedules where response_id = ${id}::uuid`;
      return NextResponse.json({ ok: true, status: "requested" });
    }

    const status = action === "confirm" ? "confirmed" : "cancelled";
    const when = action === "confirm" ? scheduledAt : null;
    await q`
      insert into interview_schedules (response_id, status, scheduled_at, updated_by, updated_at)
      values (${id}::uuid, ${status}, ${when}, ${ROLE_LABEL[session.role]}, now())
      on conflict (response_id) do update set
        status       = excluded.status,
        scheduled_at = excluded.scheduled_at,
        updated_by   = excluded.updated_by,
        updated_at   = now()
    `;
    // 알림 발송은 실패해도 일정 저장을 되돌리지 않습니다.
    const answers = (await q`
      select question_code, value_text from survey_answers
       where response_id = ${id}::uuid
         and question_code in ('interview_first','interview_second','interview_topic')
    `) as { question_code: string; value_text: string | null }[];
    const pick = (code: string) =>
      answers.find((a) => a.question_code === code)?.value_text ?? "";

    await sendInterviewNotification({
      name: allowed[0].respondent_name,
      department: allowed[0].department_name,
      topic: pick("interview_topic"),
      scheduledAt: when,
      first: pick("interview_first"),
      second: pick("interview_second"),
      cancelled: action === "cancel",
      actedBy: ROLE_LABEL[session.role],
      dashboardUrl: interviewsUrl(request),
    });

    return NextResponse.json({ ok: true, status, scheduledAt: when });
  } catch (err) {
    console.error("[interviews] failed", err);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

function interviewsUrl(request: Request): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/dashboard/interviews`;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}/dashboard/interviews`;
  return new URL("/dashboard/interviews", request.url).toString();
}
