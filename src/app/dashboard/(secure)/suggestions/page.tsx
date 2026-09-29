import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { loadSuggestionPeriods, loadSuggestions } from "@/lib/queries";
import {
  PROGRAM,
  STATUS_LABEL,
  SUGGESTION_STATUSES,
  TOPIC_LABEL,
  isClosed,
  statusTone,
} from "@/lib/suggestions";

export const dynamic = "force-dynamic";

/**
 * 성장 제안 목록.
 *
 * 맨 위에 「회신 대기」를 크게 둡니다. 이 제도는 채택 여부를 제안자에게
 * 돌려주기로 하고 시작한 것이라, 쌓여 있는데 답이 안 나간 건수가 가장 먼저
 * 보여야 합니다. 그게 밀리면 다음 달부터 제안이 안 들어옵니다.
 */
export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: { period?: string; status?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const periods = await loadSuggestionPeriods();
  const period = searchParams.period && periods.includes(searchParams.period)
    ? searchParams.period
    : "";
  const status = STATUS_LABEL[searchParams.status ?? ""] ? searchParams.status! : "";

  const all = await loadSuggestions(period || undefined);
  const rows = status ? all.filter((r) => r.status === status) : all;

  const waiting = all.filter((r) => !isClosed(r.status)).length;
  const adopted = all.filter((r) => r.status === "adopted").length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{PROGRAM.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {period ? formatPeriod(period) : "전체 기간"}에 접수된 {all.length}건입니다.
          </p>
        </div>
        <Link href="/" className="btn-ghost px-3 py-1.5 text-xs" target="_blank">
          접수 화면 열기 ↗
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile label="전체" value={all.length} />
        <Tile
          label="회신 대기"
          value={waiting}
          note={waiting > 0 ? "채택 여부를 아직 알리지 않았습니다" : "밀린 건이 없습니다"}
          alert={waiting > 0}
        />
        <Tile label="채택" value={adopted} />
      </div>

      <div className="card p-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-muted">접수월</span>
            <select name="period" defaultValue={period} className="field w-auto py-1.5 text-sm">
              <option value="">전체</option>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-muted">상태</span>
            <select name="status" defaultValue={status} className="field w-auto py-1.5 text-sm">
              <option value="">전체</option>
              {SUGGESTION_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-ghost py-2 text-sm">
            적용
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="card px-6 py-12 text-center text-sm text-muted">
          {all.length === 0
            ? "아직 접수된 제안이 없습니다."
            : "조건에 맞는 제안이 없습니다."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const tone = statusTone(row.status);
            return (
              <li key={row.id}>
                <Link
                  href={`/dashboard/suggestions/${row.id}`}
                  className="card block p-4 transition hover:border-brand/40 hover:bg-brandTint sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{ background: tone.bg, color: tone.ink }}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                      {TOPIC_LABEL[row.topic] ?? row.topic}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-muted">
                      {formatDateTime(row.submitted_at)}
                    </span>
                  </div>
                  <p className="mt-2 font-bold leading-snug text-ink">{row.title}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">
                    {row.proposal}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {row.department_name} · {row.proposer_name}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
