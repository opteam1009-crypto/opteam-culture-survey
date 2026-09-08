import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
  passwordsConfigured,
  roleForPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!passwordsConfigured()) {
    return NextResponse.json(
      { error: "대시보드 비밀번호가 설정되지 않았습니다. 환경변수를 먼저 등록해 주세요." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const role = roleForPassword(password);
  if (!role) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  let token: string;
  try {
    token = await createSessionToken(role);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "세션 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
