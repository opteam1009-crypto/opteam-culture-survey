import { NextResponse } from "next/server";
import { ensureSchema, hasDatabaseUrl, sql } from "@/lib/db";
import { passwordsConfigured, sessionKeyAvailable } from "@/lib/auth";
import { currentPeriod } from "@/lib/period";
import { QUESTIONS } from "@/lib/questions";

export const dynamic = "force-dynamic";

/**
 * 배포 직후 설정이 제대로 물렸는지 확인하는 점검용 엔드포인트입니다.
 * 공개 주소이므로 응답 내용·응답자·건수 같은 실제 데이터는 절대 내보내지 않고,
 * "연결됐는가 / 등록됐는가" 수준의 사실만 돌려줍니다.
 */
export async function GET() {
  const ceo = configured(process.env.DASHBOARD_CEO_PASSWORD);
  const hr = configured(process.env.DASHBOARD_HR_PASSWORD);

  const database: Record<string, unknown> = {
    urlPresent: hasDatabaseUrl(),
    connected: false,
    schemaReady: false,
    departments: 0,
  };

  if (hasDatabaseUrl()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        select count(*)::int as n from departments where active = true
      `) as { n: number }[];
      database.connected = true;
      database.schemaReady = true;
      database.departments = rows[0]?.n ?? 0;
    } catch (err) {
      database.error = err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300);
    }
  }

  const mailMode = process.env.RESEND_API_KEY
    ? "resend"
    : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      ? "smtp"
      : "none";

  const auth = {
    ceoPasswordSet: ceo,
    hrPasswordSet: hr,
    // 같은 비밀번호면 역할 분리가 무의미해 로그인을 거부합니다.
    passwordsDistinct: !(ceo && hr && process.env.DASHBOARD_CEO_PASSWORD === process.env.DASHBOARD_HR_PASSWORD),
    sessionKeyReady: sessionKeyAvailable(),
    loginPossible: passwordsConfigured() && sessionKeyAvailable(),
  };

  const ready = Boolean(database.connected) && auth.loginPossible && auth.passwordsDistinct;

  return NextResponse.json(
    {
      ready,
      period: currentPeriod(),
      questionCount: QUESTIONS.length,
      database,
      auth,
      mail: {
        mode: mailMode,
        recipientsConfigured: (process.env.NOTIFY_EMAILS ?? "").includes("@"),
      },
      nextStep: nextStep(ready, database, auth),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** CHANGE_ME_ / 바꾸세요 로 시작하는 예시값은 미설정으로 봅니다. */
function configured(raw: string | undefined): boolean {
  const value = (raw ?? "").trim();
  return value.length > 0 && !value.startsWith("CHANGE_ME") && !value.startsWith("바꾸세요");
}

function nextStep(
  ready: boolean,
  database: Record<string, unknown>,
  auth: { ceoPasswordSet: boolean; passwordsDistinct: boolean; sessionKeyReady: boolean },
): string {
  if (!database.urlPresent) return "Vercel 프로젝트에 Neon 을 연결하거나 DATABASE_URL 을 등록하세요.";
  if (!database.connected) return "DATABASE_URL 은 있으나 연결에 실패했습니다. database.error 를 확인하세요.";
  if (!auth.ceoPasswordSet) return "DASHBOARD_CEO_PASSWORD 를 실제 비밀번호로 바꾼 뒤 재배포하세요.";
  if (!auth.passwordsDistinct) return "대표이사와 인사책임자 비밀번호가 같습니다. 서로 다르게 설정하세요.";
  if (!auth.sessionKeyReady) return "세션 서명 키를 만들 수 없습니다. DATABASE_URL 을 확인하세요.";
  return ready ? "설정 완료. 설문 링크를 공유하셔도 됩니다." : "설정을 다시 확인해 주세요.";
}
