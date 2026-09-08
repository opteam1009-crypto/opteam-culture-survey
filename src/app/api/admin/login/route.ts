import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  checkLoginRate,
  clearLoginFailures,
  clientKeyFrom,
  createSessionToken,
  loginConfigProblem,
  recordLoginFailure,
  roleForPassword,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configProblem = loginConfigProblem();
  if (configProblem) {
    return NextResponse.json({ error: configProblem }, { status: 503 });
  }

  const clientKey = clientKeyFrom(request);

  // 공개 주소에 있는 대시보드라 자동 대입 시도를 먼저 막습니다.
  // 잠금 장치가 고장 나면 조용히 열어두지 않고 로그인을 막습니다.
  // 열어두면 무차별 대입을 그대로 허용하게 됩니다.
  let rate;
  try {
    rate = await checkLoginRate(clientKey);
  } catch (err) {
    console.error("[login] rate check failed", err);
    return NextResponse.json(
      { error: "일시적인 오류로 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
  if (!rate.allowed) {
    const minutes = Math.ceil(rate.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `로그인 시도가 너무 많습니다. ${minutes}분 후에 다시 시도해 주세요.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
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
    let remaining = rate.remaining - 1;
    try {
      const after = await recordLoginFailure(clientKey);
      remaining = after.remaining;
    } catch (err) {
      console.error("[login] failure record failed", err);
    }
    return NextResponse.json(
      {
        error:
          remaining > 0 && remaining <= 3
            ? `비밀번호가 올바르지 않습니다. ${remaining}회 더 틀리면 잠시 잠깁니다.`
            : "비밀번호가 올바르지 않습니다.",
      },
      { status: 401 },
    );
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

  try {
    await clearLoginFailures(clientKey);
  } catch {
    // 실패 기록 정리에 실패해도 로그인 자체는 진행합니다.
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
