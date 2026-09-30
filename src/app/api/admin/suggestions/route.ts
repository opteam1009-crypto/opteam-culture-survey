import { NextResponse } from "next/server";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { VALID_STATUSES, isClosed } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

/** 제안 처리 상태와 회신 내용 저장. */
export async function POST(request: Request) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: unknown;
    status?: unknown;
    reply?: unknown;
  };
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 2000) : "";

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 400 });
  }
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "알 수 없는 상태입니다." }, { status: 400 });
  }
  // 채택·미채택·이관은 제안자에게 결과가 가는 단계입니다. 회신 없이 닫으면
  // 제안자는 묵살당했다고 느끼고 다음부터 제안하지 않습니다.
  if (isClosed(status) && !reply) {
    return NextResponse.json(
      { error: "채택·미채택·담당 창구로 전달은 제안자에게 보낼 회신 내용을 적어야 저장됩니다." },
      { status: 400 },
    );
  }

  try {
    await ensureSchema();
    const q = sql();
    const updated = (await q`
      update suggestions set
        status     = ${status},
        reply      = ${reply},
        -- 회신 시각은 내용이 처음 적힐 때 남깁니다. 오타를 고쳤다고 해서
        -- 회신 날짜가 오늘로 밀리면 언제 답했는지 알 수 없게 됩니다.
        replied_at = case
                       when ${reply} = '' then null
                       when replied_at is null then now()
                       else replied_at
                     end,
        handled_by = ${ROLE_LABEL[session.role]}
       where id = ${id}::uuid
       returning id, status
    `) as { id: string; status: string }[];

    if (updated.length === 0) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: updated[0].status });
  } catch (err) {
    console.error("[admin:suggestions] failed", err);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

/** 제안 1건 삭제. 테스트로 넣어본 접수를 지우기 위한 기능이며 되돌릴 수 없습니다. */
export async function DELETE(request: Request) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "삭제할 제안을 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    await ensureSchema();
    const removed = (await sql()`
      delete from suggestions where id = ${id}::uuid returning id
    `) as { id: string }[];
    if (removed.length === 0) {
      return NextResponse.json({ error: "이미 삭제된 제안입니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin:suggestions:delete] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
