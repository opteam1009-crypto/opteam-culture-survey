import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import {
  CONFIDENTIAL_CHANNELS,
  MAX_CONTACT,
  MAX_FIELD,
  confidentialReady,
  confidentialRecipients,
  isConfidentialKind,
} from "@/lib/confidential";
import { sendConfidentialReport } from "@/lib/mail";

export const dynamic = "force-dynamic";

/**
 * 전담 창구 접수(공개). 지정 담당자에게 메일로만 보냅니다.
 * 어떤 화면에서도 읽지 않고, notification_log 에도 남기지 않습니다.
 */
export async function POST(request: Request, { params }: { params: { kind: string } }) {
  if (!isConfidentialKind(params.kind)) {
    return NextResponse.json({ error: "알 수 없는 창구입니다." }, { status: 404 });
  }
  const channel = CONFIDENTIAL_CHANNELS[params.kind];

  // 받을 사람이 없으면 아예 받지 않습니다. 아무도 읽지 않는 곳에 쌓이면 안 됩니다.
  if (!confidentialReady(channel.kind)) {
    return NextResponse.json(
      { error: "지금은 온라인 접수를 받을 수 없습니다. 담당자에게 직접 연락해 주세요." },
      { status: 503 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(payload.name, 40);
  const department = str(payload.department, 40);
  const contact = str(payload.contact, MAX_CONTACT);

  if (!name) return NextResponse.json({ error: "성함을 적어주세요." }, { status: 400 });
  if (!department) return NextResponse.json({ error: "소속을 적어주세요." }, { status: 400 });
  if (!contact) {
    return NextResponse.json(
      { error: "결과를 알려드릴 연락처를 적어주세요." },
      { status: 400 },
    );
  }

  const body: Record<string, string> = {};
  for (const field of channel.fields) {
    const value = str(payload[field.code], MAX_FIELD);
    if (field.required && !value) {
      return NextResponse.json({ error: `「${field.label}」을 적어주세요.` }, { status: 400 });
    }
    body[field.code] = value;
  }

  try {
    await ensureSchema();
    const q = sql();

    // 먼저 남기고 보냅니다. 메일이 실패해도 신고가 사라지지 않게.
    const inserted = (await q`
      insert into confidential_reports
        (kind, reporter_name, department_name, contact, body)
      values
        (${channel.kind}, ${name}, ${department}, ${contact}, ${JSON.stringify(body)}::jsonb)
      returning id
    `) as { id: string }[];
    const id = inserted[0].id;

    const result = await sendConfidentialReport({
      to: confidentialRecipients(channel.kind),
      tag: channel.mailTag,
      receiver: channel.receiver,
      name,
      department,
      contact,
      sections: channel.fields.map((f) => ({ label: f.label, value: body[f.code] })),
    });

    await q`
      update confidential_reports
         set delivery_status = ${result.status},
             delivered_at    = ${result.status === "sent" ? new Date().toISOString() : null},
             delivery_error  = ${result.error}
       where id = ${id}::uuid
    `;

    if (result.status !== "sent") {
      // 내용은 로그에 남기지 않습니다. 어느 건이 실패했는지만 남깁니다.
      console.error(`[confidential:${channel.kind}] 메일 발송 실패 id=${id}`, result.error);
      return NextResponse.json(
        {
          error:
            "접수는 저장되었지만 담당자에게 전달하지 못했습니다. 번거로우시겠지만 담당자에게 직접 한 번 더 알려주세요.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[confidential:${channel.kind}] failed`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
