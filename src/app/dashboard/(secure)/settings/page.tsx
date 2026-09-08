import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";
import { loadDepartments } from "@/lib/queries";
import { formatDateTime } from "@/lib/period";
import { SCALE_QUESTIONS, TEXT_QUESTIONS } from "@/lib/questions";
import DepartmentManager from "@/components/DepartmentManager";

export const dynamic = "force-dynamic";

interface NotificationRow {
  id: number;
  recipients: string;
  subject: string;
  status: string;
  error: string | null;
  created_at: string;
}

export default async function SettingsPage() {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const departments = await loadDepartments();

  await ensureSchema();
  const notifications = (await sql()`
    select id, recipients, subject, status, error, created_at
      from notification_log
     order by created_at desc
     limit 10
  `) as NotificationRow[];

  const mailMode = process.env.RESEND_API_KEY
    ? "Resend"
    : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
      ? "SMTP"
      : null;
  const notifyCount = (process.env.NOTIFY_EMAILS ?? "")
    .split(/[,;\s]+/)
    .filter((s) => s.includes("@")).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">설정</h1>
        <p className="mt-1 text-sm text-muted">
          {ROLE_LABEL[session.role]} 계정으로 접속 중입니다. 아래 설정은 두 계정 모두에 적용됩니다.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="text-base font-bold">소속부서 목록</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          설문 첫 화면의 드롭다운에 표시되는 목록입니다. 조직이 개편되면 여기서 바꾸면 됩니다.
        </p>
        <DepartmentManager departments={departments} />
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold">제출 알림</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          누군가 설문을 제출하면 지정한 주소로 알림 메일이 발송됩니다.
        </p>
        <dl className="grid gap-3 sm:grid-cols-3">
          <Status label="발송 수단" value={mailMode ?? "미설정"} ok={Boolean(mailMode)} />
          <Status
            label="수신 주소"
            value={notifyCount > 0 ? `${notifyCount}곳` : "미설정"}
            ok={notifyCount > 0}
          />
          <Status
            label="최근 발송"
            value={notifications[0] ? formatDateTime(notifications[0].created_at) : "기록 없음"}
            ok={notifications[0]?.status === "sent"}
          />
        </dl>
        {!mailMode && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900">
            발송 수단이 아직 설정되지 않았습니다. 제출 기록은 아래 목록에 그대로 쌓이므로 누락되지
            않지만, 메일로 받으시려면 <code className="font-semibold">RESEND_API_KEY</code> 또는{" "}
            <code className="font-semibold">SMTP_HOST / SMTP_USER / SMTP_PASS</code> 환경변수를
            등록해 주세요.
          </p>
        )}

        <h3 className="mb-2 mt-6 text-sm font-bold">최근 알림 기록</h3>
        {notifications.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            아직 제출된 응답이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {notifications.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <StatusChip status={row.status} />
                <span className="min-w-0 flex-1 truncate">{row.subject}</span>
                <span className="text-xs tabular-nums text-muted">
                  {formatDateTime(row.created_at)}
                </span>
                {row.error && <span className="w-full text-xs text-red-600">{row.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-base font-bold">설문 구성</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          현재 척도 문항 {SCALE_QUESTIONS.length}개, 주관식 {TEXT_QUESTIONS.length}개로 구성되어
          있습니다. 문항을 바꾸려면 코드의 <code>src/lib/questions.ts</code> 를 수정한 뒤 다시
          배포하면 되고, 문항 코드를 유지하면 과거 회차와의 추이 비교가 그대로 이어집니다.
        </p>
      </section>
    </div>
  );
}

function Status({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-line px-3.5 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: ok ? "#0ca30c" : "#ec835a" }}
        />
        {value}
      </dd>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; ink: string }> = {
    sent: { label: "발송됨", bg: "#e7f6e7", ink: "#056b05" },
    queued: { label: "대기", bg: "#fdeee7", ink: "#93441f" },
    failed: { label: "실패", bg: "#fbeaea", ink: "#9c2b2b" },
    skipped: { label: "건너뜀", bg: "#f0efec", ink: "#52514e" },
  };
  const tone = map[status] ?? { label: status, bg: "#f0efec", ink: "#52514e" };
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
      style={{ background: tone.bg, color: tone.ink }}
    >
      {tone.label}
    </span>
  );
}
