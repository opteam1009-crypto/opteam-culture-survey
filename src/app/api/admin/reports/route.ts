import { NextResponse } from "next/server";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { VALID_REPORT_STATUSES } from "@/lib/confidential";

export const dynamic = "force-dynamic";

/** 고충·신고 처리 상태와 처리 메모 저장. */
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
    note?: unknown;
  };
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 3000) : "";

  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 400 });
  }
  if (!VALID_REPORT_STATUSES.has(status)) {
    return NextResponse.json({ error: "알 수 없는 상태입니다." }, { status: 400 });
  }
  // 처리 완료로 닫을 때는 무엇을 했는지 남겨야 합니다. 나중에 확인할 방법이 없어집니다.
  if (status === "done" && !note) {
    return NextResponse.json(
      { error: "처리 완료로 바꾸려면 처리 내용을 적어주세요." },
      { status: 400 },
    );
  }

  try {
    await ensureSchema();
    const updated = (await sql()`
      update confidential_reports
         set status = ${status}, note = ${note},
             handled_by = ${ROLE_LABEL[session.role]}, updated_at = now()
       where id = ${id}::uuid
       returning id
    `) as { id: string }[];
    if (updated.length === 0) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin:reports] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
