import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { formatPeriod } from "@/lib/period";
import { formatScore, scoreTone } from "@/lib/score";
import { loadResponseDetail } from "@/lib/queries";
import ResponseSheet, { type SheetAnswer } from "@/components/ResponseSheet";
import ResponseSummary from "@/components/ResponseSummary";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ResponseDetailPage({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const detail = await loadResponseDetail(session.role, params.id).catch(() => null);
  if (!detail) notFound();

  const byCode = new Map<string, SheetAnswer>(
    detail.answers.map((a) => [a.question_code, { value_num: a.value_num, value_text: a.value_text }]),
  );
  const tone = scoreTone(detail.overall_score);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/responses" className="text-xs font-semibold text-brand">
          ← 응답 목록
        </Link>
        {/* 저장 파일명: 기획운영팀_김서준_2026-09 */}
        <PrintButton
          filename={`${detail.department_name}_${detail.respondent_name}_${detail.period}`}
        />
      </div>

      <ResponseSummary detail={detail} />

      {/*
        문항이 길어 스크롤을 한참 내리면 누구 응답을 보는 중인지 잊게 됩니다.
        요약표 아래에 두어, 화면 위로 올라가는 순간부터 상단에 붙어 따라옵니다.
        sticky 는 조상에 overflow 가 걸리면 동작하지 않으니 이 위치를 유지하세요.
      */}
      <div className="sticky top-0 z-20 rounded-xl border border-line bg-white px-4 py-3 shadow-[0_4px_12px_-4px_rgba(16,24,40,0.18)] print:hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[15px] font-bold">{detail.respondent_name}</span>
          <span className="text-sm font-medium text-muted">{detail.department_name}</span>
          <span className="text-xs text-muted">{formatPeriod(detail.period)}</span>
          <span
            className="ml-auto shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums"
            style={{ background: tone.bg, color: tone.ink }}
          >
            종합 {formatScore(detail.overall_score)} · {tone.label}
          </span>
        </div>
      </div>

      <ResponseSheet answers={byCode} />
    </div>
  );
}
