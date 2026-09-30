import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatDateTime, formatPeriod } from "@/lib/period";
import { loadSuggestion } from "@/lib/queries";
import {
  PROGRAM,
  STATUS_LABEL,
  SUGGESTION_FIELDS,
  TOPIC_LABEL,
  statusTone,
} from "@/lib/suggestions";
import SuggestionStatusControls from "@/components/SuggestionStatusControls";
import PrintButton from "@/components/PrintButton";
import DeleteEntryButton from "@/components/DeleteEntryButton";
import AttachmentGallery from "@/components/AttachmentGallery";
import { loadAttachmentList } from "@/lib/attachments";

export const dynamic = "force-dynamic";

export default async function SuggestionDetailPage({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) notFound();
  const item = await loadSuggestion(params.id);
  if (!item) notFound();

  const tone = statusTone(item.status);
  const attachments =
    item.attachment_count > 0 ? await loadAttachmentList({ suggestionId: item.id }) : [];
  const body: Record<string, string> = {
    situation: item.situation,
    proposal: item.proposal,
    expect: item.expect,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/suggestions" className="btn-ghost px-3 py-1.5 text-xs">
          ← 제안 목록
        </Link>
        {/* 저장 파일명: 업무제도개선_기획운영팀_홍길동 */}
        <PrintButton filename={`${PROGRAM.file}_${item.department_name}_${item.proposer_name}`} />
      </div>

      <article className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
            style={{ background: tone.bg, color: tone.ink }}
          >
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
            {TOPIC_LABEL[item.topic] ?? item.topic}
          </span>
          <span className="ml-auto text-[11px] tabular-nums text-muted">
            {formatPeriod(item.period)} 접수 · {formatDateTime(item.submitted_at)}
          </span>
        </div>

        <h1 className="mt-2.5 text-xl font-bold leading-snug">{item.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {item.department_name} · {item.proposer_name}
        </p>

        <div className="mt-5 space-y-4 border-t border-line pt-5">
          {SUGGESTION_FIELDS.map((field) => (
            <section key={field.code}>
              <h2 className="text-xs font-bold text-brand">{field.label}</h2>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-[1.8] text-ink/85">
                {body[field.code]}
              </p>
            </section>
          ))}
        </div>

        <AttachmentGallery title="참고 사진" items={attachments} />

        {item.reply && (
          <section className="mt-5 rounded-xl bg-gray-50 px-4 py-3.5">
            <h2 className="text-xs font-bold text-muted">
              제안자에게 회신한 내용
              {item.replied_at && (
                <span className="ml-1.5 font-normal tabular-nums">
                  {formatDateTime(item.replied_at)}
                  {item.handled_by ? ` · ${item.handled_by}` : ""}
                </span>
              )}
            </h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
              {item.reply}
            </p>
          </section>
        )}
      </article>

      <section className="card p-5 sm:p-7 print:hidden">
        <h2 className="text-[15px] font-bold">처리</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          기획운영팀이 월 1회 취합해 대표님께 보고한 뒤, 여기서 결과를 남깁니다.
        </p>
        <div className="mt-4">
          <SuggestionStatusControls id={item.id} status={item.status} reply={item.reply} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 print:hidden">
        <p className="text-xs text-muted">테스트로 넣은 제안은 삭제할 수 있습니다.</p>
        <DeleteEntryButton
          endpoint="/api/admin/suggestions"
          id={item.id}
          question="이 제안을 삭제할까요?"
          detail={`${item.department_name} · ${item.proposer_name}\n「${item.title}」`}
          after="/dashboard/suggestions"
        />
      </div>
    </div>
  );
}
