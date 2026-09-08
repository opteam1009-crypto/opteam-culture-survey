import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * 대시보드는 렌더를 시작하기 전에 차단합니다.
 * 페이지 안에서만 검사하면 loading.tsx 스켈레톤이 200 으로 먼저 나간 뒤
 * 리다이렉트가 스트리밍되어, 상태 코드만 보면 잠긴 것처럼 보이지 않습니다.
 * 여기서 막으면 인증되지 않은 요청에 서버 렌더 비용도 들지 않습니다.
 */

const SESSION_COOKIE = "opteam_session";

const DB_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
];

function realValue(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value || value.startsWith("CHANGE_ME") || value.startsWith("바꾸세요")) return "";
  return value;
}

// lib/auth.ts 의 파생 방식과 같은 결과를 내야 합니다(둘 다 원본의 SHA-256 원시 바이트).
// 미들웨어는 엣지 런타임이라 node:crypto 대신 Web Crypto 를 씁니다.
async function sessionKey(): Promise<Uint8Array | null> {
  const explicit = realValue(process.env.SESSION_SECRET);
  if (explicit.length >= 16) return new TextEncoder().encode(explicit);

  const url = DB_URL_KEYS.map((k) => process.env[k]?.trim() ?? "").find(
    (v) => v.length > 0 && !v.includes("user:password@") && !v.includes("ep-xxx"),
  );
  if (!url) return null;

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`opteam-culture-survey:session:${url}`),
  );
  return new Uint8Array(digest);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const key = await sessionKey();
      if (key) {
        const { payload } = await jwtVerify(token, key);
        if (payload.role === "ceo" || payload.role === "hr") return NextResponse.next();
      }
    } catch {
      // 만료·위조된 토큰은 아래에서 로그인 화면으로 보냅니다.
    }
  }

  const login = new URL("/dashboard/login", request.url);
  const response = NextResponse.redirect(login);
  // 못 쓰는 쿠키가 남아 매번 검증 비용을 내지 않도록 정리합니다.
  if (token) response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export const config = {
  // 설문 페이지(/)와 로그인 화면은 누구나 열 수 있어야 하므로 제외합니다.
  matcher: ["/dashboard", "/dashboard/((?!login).*)"],
};
