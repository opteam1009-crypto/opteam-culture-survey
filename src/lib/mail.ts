import { sql } from "./db";

export interface NotificationInput {
  responseId: string;
  name: string;
  department: string;
  period: string;
  visibility: string;
  overallScore: number | null;
  submittedAt: Date;
  dashboardUrl: string;
}

export const VISIBILITY_LABEL: Record<string, string> = {
  both: "대표이사 + 인사책임자",
  ceo_only: "대표이사만",
  hr_only: "인사책임자만",
};

function recipients(): string[] {
  const raw = process.env.NOTIFY_EMAILS ?? "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function buildBody(input: NotificationInput): { subject: string; text: string; html: string } {
  const when = input.submittedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const score = input.overallScore === null ? "—" : `${input.overallScore.toFixed(1)}점 / 100점`;
  const scope = VISIBILITY_LABEL[input.visibility] ?? input.visibility;

  const subject = `[사내 설문] ${input.department} ${input.name}님이 ${input.period} 설문을 제출했습니다`;

  const text = [
    `${input.period} 사내 업무환경·소통 진단 설문이 제출되었습니다.`,
    "",
    `제출자   : ${input.name}`,
    `소속부서 : ${input.department}`,
    `제출시각 : ${when}`,
    `종합점수 : ${score}`,
    `열람범위 : ${scope}`,
    "",
    `대시보드에서 확인: ${input.dashboardUrl}`,
    "",
    "※ 응답자가 지정한 열람 범위에 따라 대시보드에서 보이는 내용이 계정별로 다를 수 있습니다.",
  ].join("\n");

  const html = `<!doctype html><html lang="ko"><body style="margin:0;background:#f6f7f9;padding:24px;font-family:-apple-system,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px">
<tr><td style="padding:24px 24px 8px">
<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#1f4d8f;text-transform:uppercase">설문 제출 알림</div>
<h1 style="margin:8px 0 0;font-size:18px;line-height:1.5">${escapeHtml(input.department)} ${escapeHtml(input.name)}님이<br>${escapeHtml(input.period)} 설문을 제출했습니다</h1>
</td></tr>
<tr><td style="padding:16px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse">
${row("제출자", escapeHtml(input.name))}
${row("소속부서", escapeHtml(input.department))}
${row("제출시각", escapeHtml(when))}
${row("종합점수", escapeHtml(score))}
${row("열람범위", escapeHtml(scope))}
</table>
</td></tr>
<tr><td style="padding:8px 24px 24px">
<a href="${escapeAttr(input.dashboardUrl)}" style="display:inline-block;background:#1f4d8f;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">대시보드에서 확인하기</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6b7280">응답자가 지정한 열람 범위에 따라 대시보드에서 보이는 내용이 계정별로 다를 수 있습니다.</p>
</td></tr>
</table></body></html>`;

  return { subject, text, html };
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:7px 0;color:#6b7280;width:88px;vertical-align:top">${label}</td><td style="padding:7px 0;font-weight:600">${value}</td></tr>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/**
 * 제출 알림을 보냅니다. 발송 수단이 설정되어 있지 않거나 발송이 실패해도
 * 내용은 notification_log 에 남기므로 "누가 제출했는지" 기록은 유실되지 않습니다.
 * 설문 제출 자체를 막지 않도록 어떤 경우에도 예외를 밖으로 던지지 않습니다.
 */
export async function sendSubmissionNotification(input: NotificationInput): Promise<void> {
  const to = recipients();
  const { subject, text, html } = buildBody(input);
  const q = sql();

  if (to.length === 0) {
    await logNotification(q, input.responseId, "", subject, text, "skipped", "NOTIFY_EMAILS 미설정");
    return;
  }

  let status = "pending";
  let error: string | null = null;

  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(to, subject, text, html);
      status = "sent";
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      await sendViaSmtp(to, subject, text, html);
      status = "sent";
    } else {
      status = "queued";
      error = "발송 수단(RESEND_API_KEY 또는 SMTP_*)이 설정되지 않았습니다.";
    }
  } catch (err) {
    status = "failed";
    error = err instanceof Error ? err.message : String(err);
  }

  await logNotification(q, input.responseId, to.join(", "), subject, text, status, error);
}

async function logNotification(
  q: ReturnType<typeof sql>,
  responseId: string,
  to: string,
  subject: string,
  body: string,
  status: string,
  error: string | null,
): Promise<void> {
  try {
    await q`
      insert into notification_log (response_id, recipients, subject, body, status, error, sent_at)
      values (${responseId}, ${to}, ${subject}, ${body}, ${status}, ${error},
              ${status === "sent" ? new Date().toISOString() : null})`;
  } catch {
    // 로그 기록 실패가 제출을 막아서는 안 됩니다.
  }
}

async function sendViaResend(to: string[], subject: string, text: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "사내설문 <onboarding@resend.dev>",
      to,
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function sendViaSmtp(to: string[], subject: string, text: string, html: string) {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: to.join(", "),
    subject,
    text,
    html,
  });
}
