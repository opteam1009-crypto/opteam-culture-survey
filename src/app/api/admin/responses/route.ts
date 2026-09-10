import { NextResponse } from "next/server";
import { VISIBLE_TO, readSession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 응답 1건 삭제. 테스트로 넣어본 제출을 지우기 위한 기능입니다.
 *
 * 삭제 대상은 "그 계정이 원래 볼 수 있는 응답"으로 제한합니다. 열람 범위를
 * 「대표이사만」으로 지정한 응답을 인사책임자가 지울 수 있으면, 볼 수는 없는데
 * 없앨 수는 있는 셈이 되어 응답자에게 약속한 범위가 무너집니다.
 * survey_answers 와 notification_log 는 on delete cascade 로 함께 지워집니다.
 */
export async function POST(request: Request) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: unknown; id?: unknown };
  if (body.action !== "delete") {
    return NextResponse.json({ error: "알 수 없는 요청입니다." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "삭제할 응답을 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    await ensureSchema();
    const removed = (await sql()`
      delete from survey_responses
       where id = ${id}::uuid
         and visibility = any(${VISIBLE_TO[session.role]})
      returning respondent_name
    `) as { respondent_name: string }[];

    if (removed.length === 0) {
      return NextResponse.json(
        { error: "이미 삭제되었거나 이 계정으로는 삭제할 수 없는 응답입니다." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, name: removed[0].respondent_name });
  } catch (err) {
    console.error("[responses:delete] failed", err);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
