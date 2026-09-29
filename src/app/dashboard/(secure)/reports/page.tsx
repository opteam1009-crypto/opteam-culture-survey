import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/period";
import { loadReports } from "@/lib/queries";
import {
  CONFIDENTIAL_CHANNELS,
  GRIEVANCE_DEADLINE_DAYS,
  REPORT_STATUS_LABEL,
  isConfidentialKind,
  reportTone,
  type ConfidentialReport,
} from "@/lib/confidential";
import ReportDeadline, { daysSince } from "@/components/ReportDeadline";

export const dynamic = "force-dynamic";

/**
 * 고충·신고 목록.
 *
 * 개인 고충은 들은 날부터 10일 이내에 결과를 알려야 합니다(근로자참여법).
 * 그래서 처리 중인 고충에는 며칠째인지와 남은 기한을 붙이고, 기한이 가까운
 * 건을 맨 위 숫자로 먼저 보여줍니다.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { kind?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const kind = searchParams.kind && isConfidentialKind(searchParams.kind) ? searchParams.kind : "";
  const all = await loadReports();
  const rows = kind ? all.filter((r) => r.kind === kind) : all;

  const open = all.filter((r) => r.status !== "done");
  const urgent = open.filter(
    (r) => r.kind === "grievance" && daysSince(r.submitted_at) >= GRIEVANCE_DEADLINE_DAYS - 3,
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">고충·신고</h1>
        <p className="mt-1 text-sm text-muted">
          개인 고충과 직장 내 괴롭힘 신고 접수 내역입니다. 설문·제안과 따로 관리합니다.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile label="미처리" value={open.length} alert={open.length > 0} />
        <Tile
          label="고충 처리 기한 임박"
          value={urgent.length}
          note={`접수 후 ${GRIEVANCE_DEADLINE_DAYS}일 이내 결과 통보`}
          alert={urgent.length > 0}
        />
        <Tile label="전체" value={all.length} />
      </div>

      <div className="flex gap-1 rounded-xl border border-line bg-white p-0.5 text-xs font-semibold sm:w-fit">
        <Tab href="/dashboard/reports" active={!kind} label="전체" />
        <Tab href="/dashboard/reports?kind=grievance" active={kind === "grievance"} label="개인 고충" />
        <Tab href="/dashboard/reports?kind=harassment" active={kind === "harassment"} label="직장 내 괴롭힘" />
      </div>

      {rows.length === 0 ? (
        <p className="card px-6 py-12 text-center text-sm text-muted">접수된 내역이 없습니다.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <ReportCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportCard({ r }: { r: ConfidentialReport }) {
  const tone = reportTone(r.status);
  const channel = CONFIDENTIAL_CHANNELS[r.kind];
  const first = channel.fields.find((f) => f.code === "what");
  return (
    <Link
      href={`/dashboard/reports/${r.id}`}
      className="card block p-4 transition hover:border-brand/40 hover:bg-brandTint sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: tone.bg, color: tone.ink }}
        >
          {REPORT_STATUS_LABEL[r.status] ?? r.status}
        </span>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
          {r.kind === "grievance" ? "개인 고충" : "직장 내 괴롭힘"}
        </span>
        <ReportDeadline r={r} />
        <span className="ml-auto text-[11px] tabular-nums text-muted">
          {formatDateTime(r.submitted_at)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-ink">
        {(first && r.body?.[first.code]) || "—"}
      </p>
      <p className="mt-2 text-xs text-muted">
        {r.department_name} · {r.reporter_name}
      </p>
    </Link>
  );
}

function Tile({
  label,
  value,
  note,
  alert,
}: {
  label: string;
  value: number;
  note?: string;
  alert?: boolean;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${alert ? "text-[#93441f]" : "text-ink"}`}>
        {value}
        <span className="ml-0.5 text-sm font-semibold">건</span>
      </p>
      {note && <p className="mt-0.5 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

function Tab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 transition ${
        active ? "bg-brand text-white" : "text-muted hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}
