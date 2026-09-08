import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";

export type Role = "ceo" | "hr";

export const ROLE_LABEL: Record<Role, string> = {
  ceo: "대표이사",
  hr: "인사책임자",
};

/** 각 역할이 열람할 수 있는 응답의 공개 범위. */
export const VISIBLE_TO: Record<Role, string[]> = {
  ceo: ["both", "ceo_only"],
  hr: ["both", "hr_only"],
};

export const SESSION_COOKIE = "opteam_session";
const SESSION_HOURS = 12;

export interface Session {
  role: Role;
}

/**
 * .env.example 의 예시값이 그대로 배포되는 사고를 막습니다.
 * Vercel 은 프로젝트를 import 할 때 레포의 .env.example 을 읽어 환경변수를
 * 자동 생성하므로, 값을 바꾸지 않으면 레포만 보면 누구나 아는 비밀번호로
 * 대시보드가 열립니다. 그런 값은 설정되지 않은 것으로 간주합니다.
 */
function realValue(raw: string | undefined): string {
  if (!raw) return "";
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("바꾸세요") || value.startsWith("CHANGE_ME")) return "";
  return value;
}

export class PlaceholderSecretError extends Error {
  constructor() {
    super(
      "SESSION_SECRET 이 설정되지 않았거나 .env.example 의 예시값 그대로입니다. " +
        "Vercel 환경변수에서 32자 이상의 실제 랜덤 문자열로 바꾼 뒤 재배포하세요.",
    );
    this.name = "PlaceholderSecretError";
  }
}

function secretKey(): Uint8Array {
  const secret = realValue(process.env.SESSION_SECRET);
  if (secret.length < 16) throw new PlaceholderSecretError();
  return new TextEncoder().encode(secret);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // 길이가 다르면 timingSafeEqual 이 던지므로 길이를 먼저 맞춰 비교합니다.
  if (bufA.length !== bufB.length) {
    // 길이 노출을 줄이기 위해 더미 비교를 수행합니다.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/** 비밀번호로 역할을 판별합니다. 일치하는 역할이 없으면 null. */
export function roleForPassword(password: string): Role | null {
  const ceo = realValue(process.env.DASHBOARD_CEO_PASSWORD);
  const hr = realValue(process.env.DASHBOARD_HR_PASSWORD);
  // 두 계정에 같은 비밀번호를 넣으면 역할 분리가 무의미해지므로 거부합니다.
  if (ceo && hr && ceo === hr) return null;
  if (ceo && safeEqual(password, ceo)) return "ceo";
  if (hr && safeEqual(password, hr)) return "hr";
  return null;
}

export function passwordsConfigured(): boolean {
  return Boolean(
    realValue(process.env.DASHBOARD_CEO_PASSWORD) || realValue(process.env.DASHBOARD_HR_PASSWORD),
  );
}

/** 설정이 잘못되어 로그인이 불가능한 이유. 정상이면 null. */
export function loginConfigProblem(): string | null {
  const ceo = realValue(process.env.DASHBOARD_CEO_PASSWORD);
  const hr = realValue(process.env.DASHBOARD_HR_PASSWORD);
  if (!ceo && !hr) {
    return "대시보드 비밀번호가 설정되지 않았습니다. Vercel 환경변수에 DASHBOARD_CEO_PASSWORD 와 DASHBOARD_HR_PASSWORD 를 실제 값으로 등록한 뒤 재배포해 주세요.";
  }
  if (ceo && hr && ceo === hr) {
    return "대표이사와 인사책임자 비밀번호가 같습니다. 열람 범위가 계정별로 갈리므로 서로 다르게 설정해 주세요.";
  }
  if (!realValue(process.env.SESSION_SECRET) || realValue(process.env.SESSION_SECRET).length < 16) {
    return "SESSION_SECRET 이 설정되지 않았거나 예시값 그대로입니다. 32자 이상의 실제 랜덤 문자열로 바꾼 뒤 재배포해 주세요.";
  }
  return null;
}

export async function createSessionToken(role: Role): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

export async function readSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role;
    if (role === "ceo" || role === "hr") return { role };
    return null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
};
