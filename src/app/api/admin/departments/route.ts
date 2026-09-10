import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { DEPARTMENTS_TAG } from "@/lib/queries";
import { readSession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

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

  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 40) {
    return NextResponse.json({ error: "부서명을 1~40자로 입력해 주세요." }, { status: 400 });
  }

  try {
    await ensureSchema();
    const existing = (await sql()`select id from departments where name = ${name}`) as { id: number }[];
    if (existing.length > 0) {
      return NextResponse.json({ error: "이미 있는 부서명입니다." }, { status: 409 });
    }
    const next = (await sql()`select coalesce(max(sort_order), 0) + 10 as v from departments`) as {
      v: number;
    }[];
    await sql()`insert into departments (name, sort_order) values (${name}, ${next[0]?.v ?? 10})`;
    revalidateTag(DEPARTMENTS_TAG);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[departments:create]", err);
    return NextResponse.json({ error: "부서를 추가하지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: unknown;
    name?: unknown;
    active?: unknown;
  };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "대상 부서를 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    await ensureSchema();
    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name || name.length > 40) {
        return NextResponse.json({ error: "부서명을 1~40자로 입력해 주세요." }, { status: 400 });
      }
      const clash = (await sql()`
        select id from departments where name = ${name} and id <> ${id}
      `) as { id: number }[];
      if (clash.length > 0) {
        return NextResponse.json({ error: "이미 있는 부서명입니다." }, { status: 409 });
      }
      // 과거 응답에 남은 부서명 스냅샷도 함께 맞춰 집계가 갈라지지 않게 합니다.
      const before = (await sql()`select name from departments where id = ${id}`) as {
        name: string;
      }[];
      await sql()`update departments set name = ${name} where id = ${id}`;
      if (before[0]) {
        await sql()`update survey_responses set department_name = ${name} where department_id = ${id}`;
      }
    }
    if (typeof body.active === "boolean") {
      await sql()`update departments set active = ${body.active} where id = ${id}`;
    }
    revalidateTag(DEPARTMENTS_TAG);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[departments:update]", err);
    return NextResponse.json({ error: "부서를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "대상 부서를 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    await ensureSchema();
    // 응답이 한 건이라도 달린 부서는 지우지 않습니다. 과거 집계가 깨지기 때문입니다.
    // 그런 경우에는 '숨기기'로 설문 드롭다운에서만 빼면 됩니다.
    const used = (await sql()`
      select count(*)::int as n from survey_responses where department_id = ${id}
    `) as { n: number }[];
    if ((used[0]?.n ?? 0) > 0) {
      return NextResponse.json(
        { error: "이미 응답이 있는 부서는 삭제할 수 없습니다. '숨기기'를 사용해 주세요." },
        { status: 409 },
      );
    }
    await sql()`delete from departments where id = ${id}`;
    revalidateTag(DEPARTMENTS_TAG);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[departments:delete]", err);
    return NextResponse.json({ error: "부서를 삭제하지 못했습니다." }, { status: 500 });
  }
}
