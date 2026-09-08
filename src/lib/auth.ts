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

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET 환경변수가 없거나 너무 짧습니다. 32자 이상의 랜덤 문자열을 설정하세요.",
    );
  }
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
  const ceo = process.env.DASHBOARD_CEO_PASSWORD ?? "";
  const hr = process.env.DASHBOARD_HR_PASSWORD ?? "";
  if (ceo && safeEqual(password, ceo)) return "ceo";
  if (hr && safeEqual(password, hr)) return "hr";
  return null;
}

export function passwordsConfigured(): boolean {
  return Boolean(process.env.DASHBOARD_CEO_PASSWORD || process.env.DASHBOARD_HR_PASSWORD);
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
