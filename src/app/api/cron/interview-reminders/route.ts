import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { sendInterviewReminder, type ReminderItem } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * 곧 있을 면담 알림. 스케줄러가 주기적으로 호출합니다.
 *
 * - 기본(soon)   : 지금부터 LEAD_MINUTES 안에 시작하는 확정 면담을 건별로 알립니다.
 *                  같은 면담에 두 번 가지 않도록 보낸 시각을 기록합니다.
 * - ?mode=digest : 오늘 예정된 확정 면담을 한 통으로 묶어 보냅니다.
 *
 * Vercel 무료 플랜의 예약 실행은 하루 1회뿐이라 1시간 전 알림을 낼 수 없습니다.
 * 그래서 digest 는 Vercel 예약으로, soon 은 10분 간격의 외부 스케줄러
 * (cron-job.org 등)로 부르도록 두 모드를 함께 둡니다.
 *
 * 인증: CRON_SECRET 이 설정되어 있으면 Authorization: Bearer <값> 또는 ?key=<값>
 * 이 있어야 합니다. Vercel 예약 실행은 이 헤더를 자동으로 붙여줍니다.
 */

/** 면담 시각이 몇 분 앞으로 다가왔을 때 알릴지. */
const LEAD_MINUTES = 90;

/** 한국 시간 기준 'YYYY-MM-DD HH:MM'. 저장된 면담 일시와 같은 형식이라 문자열로 비교합니다. */
function seoulStamp(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // hourCycle 에 따라 24시가 나올 수 있어 00 으로 맞춥니다.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}`;
}

function authorized(request: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return true; // 설정하지 않았으면 막지 않습니다.
  const header = request.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get("key") === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const mode = new URL(request.url).searchParams.get("mode") === "digest" ? "digest" : "soon";

  try {
    await ensureSchema();
    const q = sql();
    const now = new Date();
    const from = seoulStamp(now);

    if (mode === "digest") {
      // 오늘(한국 시간) 예정된 확정 면담. 지난 시각도 포함해 하루치를 한눈에 봅니다.
      const day = from.slice(0, 10);
      const rows = (await q`
        select r.respondent_name, r.department_name, s.scheduled_at,
               coalesce(a.value_text, '') as topic
          from interview_schedules s
          join survey_responses r on r.id = s.response_id
          left join survey_answers a
                 on a.response_id = s.response_id and a.question_code = 'interview_topic'
         where s.status = 'confirmed'
           and s.scheduled_at like ${day + "%"}
         order by s.scheduled_at
      `) as { respondent_name: string; department_name: string; scheduled_at: string; topic: string }[];

      if (rows.length === 0) return NextResponse.json({ ok: true, mode, sent: 0 });
      const items = toItems(rows);
      const result = await sendInterviewReminder("digest", items, interviewsUrl(request));
      return NextResponse.json({ ok: true, mode, sent: items.length, ...result });
    }

    // 지금부터 LEAD_MINUTES 안에 시작하고, 아직 알리지 않은 확정 면담.
    const until = seoulStamp(new Date(now.getTime() + LEAD_MINUTES * 60_000));
    const rows = (await q`
      select s.response_id, r.respondent_name, r.department_name, s.scheduled_at,
             coalesce(a.value_text, '') as topic
        from interview_schedules s
        join survey_responses r on r.id = s.response_id
        left join survey_answers a
               on a.response_id = s.response_id and a.question_code = 'interview_topic'
       where s.status = 'confirmed'
         and s.reminder_sent_at is null
         and s.scheduled_at >= ${from}
         and s.scheduled_at <= ${until}
       order by s.scheduled_at
    `) as {
      response_id: string;
      respondent_name: string;
      department_name: string;
      scheduled_at: string;
      topic: string;
    }[];

    if (rows.length === 0) return NextResponse.json({ ok: true, mode, sent: 0 });

    const result = await sendInterviewReminder("soon", toItems(rows), interviewsUrl(request));
    // 발송 수단이 없거나(queued) 수신 주소가 없으면(skipped) 10분마다 다시 시도해도
    // 결과가 같고 기록만 쌓이므로 보낸 것으로 표시합니다.
    // 일시적 오류(failed)일 때만 다음 호출에서 다시 시도합니다.
    if (result.status !== "failed") {
      await q`
        update interview_schedules set reminder_sent_at = now()
         where response_id = any(${rows.map((r) => r.response_id)}::uuid[])
      `;
    }
    return NextResponse.json({ ok: true, mode, sent: rows.length, ...result });
  } catch (err) {
    console.error("[cron:interview-reminders] failed", err);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

function toItems(
  rows: { respondent_name: string; department_name: string; scheduled_at: string; topic: string }[],
): ReminderItem[] {
  return rows.map((r) => ({
    name: r.respondent_name,
    department: r.department_name,
    scheduledAt: r.scheduled_at,
    topic: r.topic,
  }));
}

function interviewsUrl(request: Request): string {
  const explicit = process.env.APP_BASE_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/dashboard/interviews`;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}/dashboard/interviews`;
  return new URL("/dashboard/interviews", request.url).toString();
}
