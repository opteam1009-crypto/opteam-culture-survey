import Link from "next/link";
import { formatDateTime } from "@/lib/period";
import { loadReports } from "@/lib/queries";
import {
  CONFIDENTIAL_CHANNELS,
  GRIEVANCE_DEADLINE_DAYS,
  REPORT_STATUS_LABEL,
  reportTone,
  type ConfidentialKind,
  type ConfidentialReport,
} from "@/lib/confidential";
import ReportDeadline, { daysSince } from "./ReportDeadline";

/** 탭마다 머리말과 맨 위 숫자가 다릅니다. 창구마다 챙겨야 할 것이 달라서입니다. */
const HEAD: Record<ConfidentialKind, { title: string; desc: string }> = {
  grievance: {
    title: "노사 고충",
    desc: "노사협의회 고충처리위원 앞으로 접수된 개인 고충입니다. 접수일로부터 10일 이내에 처리 결과를 통보해야 합니다.",
  },
  harassment: {
    title: "직장 내 괴롭힘 신고",
    desc: "접수된 직장 내 괴롭힘 신고입니다. 접수 즉시 사실관계를 확인해야 하며, 신고자의 신원과 내용은 조사에 필요한 범위에서만 다룹니다.",
  },
};

/**
 * 고충·신고 목록(탭 하나 분량).
 *
 * 개인 고충은 들은 날부터 10일 이내에 결과를 알려야 합니다(근로자참여법).
 * 그래서 고충 탭에는 기한이 3일 이내로 남은 건을 맨 위 숫자로 따로 셉니다.
 */
export default async function ReportsList({ kind }: { kind: ConfidentialKind }) {
  const rows = await loadReports(kind);
  const channel = CONFIDENTIAL_CHANNELS[kind];
  const head = HEAD[kind];

  const open = rows.filter((r) => r.status !== "done");
  const handling = rows.filter((r) => r.status === "handling");
  const urgent = open.filter((r) => daysSince(r.submitted_at) >= GRIEVANCE_DEADLINE_DAYS - 3);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{head.title}</h1>
          <p className="mt-1 max-w-3xl text-pretty text-sm leading-relaxed text-muted">{head.desc}</p>
        </div>
        <Link href={channel.path} className="btn-ghost shrink-0 px-3 py-1.5 text-xs" target="_blank">
          접수 화면 열기 ↗
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile label="미처리" value={open.length} alert={open.length > 0} />
        {kind === "grievance" ? (
          <Tile
            label="통보 기한 임박"
            value={urgent.length}
            note={`남은 기한 3일 이내 · 접수 후 ${GRIEVANCE_DEADLINE_DAYS}일 이내 통보`}
            alert={urgent.length > 0}
          />
        ) : (
          <Tile label="처리중" value={handling.length} />
        )}
        <Tile label="전체" value={rows.length} />
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
      href={`/dashboard/${r.kind}/${r.id}`}
      className="card block p-4 transition hover:border-brand/40 hover:bg-brandTint sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: tone.bg, color: tone.ink }}
        >
          {REPORT_STATUS_LABEL[r.status] ?? r.status}
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
    // 좁은 화면에서도 셋을 한 줄에 둡니다. 세로로 쌓으면 첫 화면 절반을 숫자 셋이
    // 차지해 정작 목록이 한참 아래로 밀립니다. 긴 보충 설명은 넓은 화면에서만.
    <div className="card p-3 sm:p-4">
      <p className="truncate text-[11px] font-semibold text-muted sm:text-xs">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${alert ? "text-[#93441f]" : "text-ink"}`}
      >
        {value}
        <span className="ml-0.5 text-xs font-semibold sm:text-sm">건</span>
      </p>
      {note && (
        <p className="mt-0.5 hidden text-[11px] leading-relaxed text-muted sm:block">{note}</p>
      )}
    </div>
  );
}
