import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash, timingSafeEqual } from "node:crypto";

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
      "세션 서명 키를 만들 수 없습니다. DATABASE_URL 이 연결되어 있으면 자동으로 파생되지만, " +
        "그것도 없다면 SESSION_SECRET 에 32자 이상의 랜덤 문자열을 등록한 뒤 재배포하세요.",
    );
    this.name = "PlaceholderSecretError";
  }
}

// SESSION_SECRET 을 따로 등록하지 않아도 되도록, 없으면 DATABASE_URL 에서 파생합니다.
// DATABASE_URL 은 이미 비밀이고 배포·인스턴스 간에 값이 같아 서명 키의 재료로 적합합니다.
// (이 값이 유출되면 세션 위조보다 DB 전체 유출이 훨씬 큰 문제이므로 보안 강도를 낮추지 않습니다.)
const DB_URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
];

function derivedKeyMaterial(): string {
  const url = DB_URL_KEYS.map((k) => process.env[k]?.trim() ?? "").find(
    (v) => v.length > 0 && !v.includes("user:password@") && !v.includes("ep-xxx"),
  );
  return url ?? "";
}

export function sessionKeyAvailable(): boolean {
  return realValue(process.env.SESSION_SECRET).length >= 16 || derivedKeyMaterial().length > 0;
}

function secretKey(): Uint8Array {
  const explicit = realValue(process.env.SESSION_SECRET);
  if (explicit.length >= 16) return new TextEncoder().encode(explicit);

  const material = derivedKeyMaterial();
  if (material) {
    return createHash("sha256").update(`opteam-culture-survey:session:${material}`).digest();
  }
  throw new PlaceholderSecretError();
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
  if (!sessionKeyAvailable()) {
    return "세션 서명 키를 만들 수 없습니다. DATABASE_URL 이 연결되어 있으면 자동으로 파생되지만, 그것도 없다면 SESSION_SECRET 에 32자 이상의 랜덤 문자열을 등록한 뒤 재배포해 주세요.";
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
