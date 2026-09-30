import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import {
  CONFIDENTIAL_CHANNELS,
  MAX_CONTACT,
  MAX_FIELD,
  confidentialMailReady,
  confidentialRecipients,
  isConfidentialKind,
} from "@/lib/confidential";
import { sendConfidentialReport } from "@/lib/mail";
import { attachmentColumns, parseAttachments } from "@/lib/attachments";

export const dynamic = "force-dynamic";

/**
 * 전담 창구 접수(공개). 대시보드 「고충·신고」에 남기고, 담당자 메일이
 * 등록되어 있으면 메일로도 보냅니다. notification_log 에는 남기지 않습니다.
 */
export async function POST(request: Request, { params }: { params: { kind: string } }) {
  if (!isConfidentialKind(params.kind)) {
    return NextResponse.json({ error: "알 수 없는 창구입니다." }, { status: 404 });
  }
  const channel = CONFIDENTIAL_CHANNELS[params.kind];

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

  const attached = parseAttachments(payload.attachments);
  if (!attached.ok) return NextResponse.json({ error: attached.error }, { status: 400 });
  const files = attachmentColumns(attached.files);

  try {
    await ensureSchema();
    const q = sql();

    // 대시보드에서 읽는 것이 기본입니다. 메일은 등록되어 있을 때만 덧붙입니다.
    // 접수와 증빙 사진은 한 문장으로 넣어, 사진만 빠진 채 접수가 남는 일이 없게 합니다.
    const inserted = (await q`
      with r as (
        insert into confidential_reports
          (kind, reporter_name, department_name, contact, body)
        values
          (${channel.kind}, ${name}, ${department}, ${contact}, ${JSON.stringify(body)}::jsonb)
        returning id
      ), a as (
        insert into attachments (report_id, filename, mime, size, data)
        select r.id, f.filename, f.mime, f.size, f.data
          from r, unnest(${files.names}::text[], ${files.mimes}::text[],
                         ${files.sizes}::int[], ${files.datas}::bytea[])
               as f(filename, mime, size, data)
      )
      select id from r
    `) as { id: string }[];
    const id = inserted[0].id;

    if (!confidentialMailReady(channel.kind)) {
      await q`update confidential_reports set delivery_status = 'skipped' where id = ${id}::uuid`;
      return NextResponse.json({ ok: true });
    }

    const result = await sendConfidentialReport({
      to: confidentialRecipients(channel.kind),
      tag: channel.mailTag,
      receiver: channel.receiver,
      name,
      department,
      contact,
      sections: channel.fields.map((f) => ({ label: f.label, value: body[f.code] })),
      attachmentCount: attached.files.length,
    });

    await q`
      update confidential_reports
         set delivery_status = ${result.status},
             delivered_at    = ${result.status === "sent" ? new Date().toISOString() : null},
             delivery_error  = ${result.error}
       where id = ${id}::uuid
    `;
    if (result.status !== "sent") {
      // 접수는 이미 대시보드에 있으니 실패로 돌려보내지 않습니다.
      // 내용은 로그에 남기지 않고 어느 건인지만 남깁니다.
      console.error(`[confidential:${channel.kind}] 메일 발송 실패 id=${id}`, result.error);
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
