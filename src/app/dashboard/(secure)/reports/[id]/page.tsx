import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/period";
import { loadReport } from "@/lib/queries";
import { CONFIDENTIAL_CHANNELS, REPORT_STATUS_LABEL, reportTone } from "@/lib/confidential";
import ReportDeadline from "@/components/ReportDeadline";
import ReportStatusControls from "@/components/ReportStatusControls";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) notFound();
  const r = await loadReport(params.id);
  if (!r) notFound();

  const channel = CONFIDENTIAL_CHANNELS[r.kind];
  const tone = reportTone(r.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/reports" className="btn-ghost px-3 py-1.5 text-xs">
          ← 고충·신고 목록
        </Link>
        <PrintButton filename={`${channel.mailTag}_${r.department_name}_${r.reporter_name}`} />
      </div>

      <article className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ background: tone.bg, color: tone.ink }}
          >
            {REPORT_STATUS_LABEL[r.status] ?? r.status}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
            {channel.title}
          </span>
          <ReportDeadline r={r} />
          <span className="ml-auto text-[11px] tabular-nums text-muted">
            {formatDateTime(r.submitted_at)} 접수
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Item label="접수자" value={r.reporter_name} />
          <Item label="소속" value={r.department_name} />
          <Item label="연락처" value={r.contact} />
        </dl>

        <div className="mt-5 space-y-4 border-t border-line pt-5">
          {channel.fields.map((f) => (
            <section key={f.code}>
              <h2 className="text-xs font-bold text-brand">{f.label}</h2>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[1.8] text-ink/85">
                {r.body?.[f.code] || "—"}
              </p>
            </section>
          ))}
        </div>

        {r.note && (
          <section className="mt-5 rounded-xl bg-gray-50 px-4 py-3.5">
            <h2 className="text-xs font-bold text-muted">
              처리 내용
              {r.updated_at && (
                <span className="ml-1.5 font-normal tabular-nums">
                  {formatDateTime(r.updated_at)}
                  {r.handled_by ? ` · ${r.handled_by}` : ""}
                </span>
              )}
            </h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{r.note}</p>
          </section>
        )}
      </article>

      <section className="card p-5 sm:p-7 print:hidden">
        <h2 className="text-[15px] font-bold">처리</h2>
        <div className="mt-4">
          <ReportStatusControls id={r.id} status={r.status} note={r.note} />
        </div>
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 break-all font-medium text-ink">{value}</dd>
    </div>
  );
}
