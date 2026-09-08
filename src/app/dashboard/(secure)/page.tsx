import Link from "next/link";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { currentPeriod, formatDateTime, formatPeriod, previousPeriod } from "@/lib/period";
import { SECTIONS } from "@/lib/questions";
import { formatDelta, formatScore, scoreTone } from "@/lib/score";
import {
  loadQuestionAverages,
  loadVisibleResponses,
  summarizeByDepartment,
  summarizeByPeriod,
  summarizeSections,
} from "@/lib/queries";
import TrendChart from "@/components/charts/TrendChart";
import BarList from "@/components/charts/BarList";
import Heatmap from "@/components/charts/Heatmap";
import PeriodSelect from "@/components/PeriodSelect";

export const dynamic = "force-dynamic";

const SCORED_SECTIONS = SECTIONS.filter((s) => s.code !== "open");

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const all = await loadVisibleResponses(session.role);
  const periodSummaries = summarizeByPeriod(all);
  const knownPeriods = periodSummaries.map((p) => p.period);
  const fallbackPeriod = knownPeriods[knownPeriods.length - 1] ?? currentPeriod();
  const period =
    searchParams.period && knownPeriods.includes(searchParams.period)
      ? searchParams.period
      : fallbackPeriod;

  const rows = all.filter((r) => r.period === period);
  const prev = previousPeriod(period);
  const prevRows = all.filter((r) => r.period === prev);

  const thisSummary = periodSummaries.find((p) => p.period === period);
  const prevSummary = periodSummaries.find((p) => p.period === prev);
  const overall = thisSummary?.overall ?? null;
  const delta =
    overall !== null && prevSummary?.overall != null
      ? Math.round((overall - prevSummary.overall) * 10) / 10
      : null;

  const sectionScores = summarizeSections(rows);
  const prevSectionScores = summarizeSections(prevRows);
  const departments = summarizeByDepartment(rows);
  const questions = await loadQuestionAverages(session.role, period);
  const weakest = [...questions].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 5);
  const strongest = [...questions].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3);
  const lowestSection = [...sectionScores]
    .filter((s) => s.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];

  if (all.length === 0) {
    return <EmptyState role={ROLE_LABEL[session.role]} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{formatPeriod(period)} 진단 현황</h1>
          <p className="mt-1 text-sm text-muted">
            {ROLE_LABEL[session.role]} 계정으로 열람 가능한 응답 {rows.length}건 기준입니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelect periods={[...knownPeriods].reverse()} current={period} basePath="/dashboard" />
          <a
            href={`/api/admin/export?period=${encodeURIComponent(period)}`}
            className="btn-ghost py-2 text-xs"
          >
            CSV 내려받기
          </a>
        </div>
      </header>

      {/* ── 요약 타일 ────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreTile label="종합 점수" score={overall} delta={delta} prevLabel={formatPeriod(prev)} />
        <Tile label="응답 건수" value={`${rows.length}`} unit="건" hint={`누적 ${all.length}건`} />
        <Tile
          label="참여 부서"
          value={`${departments.length}`}
          unit="개"
          hint={departments.length ? departments.map((d) => d.name).slice(0, 3).join(", ") : "—"}
        />
        <Tile
          label="가장 낮은 영역"
          value={lowestSection?.label ?? "—"}
          hint={lowestSection ? `${formatScore(lowestSection.score)}점` : "응답 없음"}
        />
      </section>

      {/* ── 월별 추이 ────────────────────────────────────── */}
      <section className="card p-6">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold">전사 종합 점수 월별 추이</h2>
          <span className="text-xs text-muted">0~100점 환산</span>
        </div>
        <p className="mb-4 text-sm text-muted">
          5점 척도 평균을 100점으로 환산한 값입니다. 50점이 &ldquo;보통&rdquo;에 해당합니다.
        </p>
        <TrendChart
          seriesName="전사 종합 점수"
          points={periodSummaries.slice(-12).map((p) => ({
            period: p.period,
            value: p.overall,
            count: p.count,
          }))}
        />
        <TrendTable summaries={periodSummaries.slice(-12)} />
      </section>

      {/* ── 영역별 / 부서별 ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-base font-bold">영역별 점수</h2>
          <p className="mb-4 mt-1 text-sm text-muted">괄호 안은 전월 대비 변화입니다.</p>
          <BarList
            showTone
            items={sectionScores.map((section) => {
              const before = prevSectionScores.find((s) => s.code === section.code)?.score ?? null;
              const diff =
                section.score !== null && before !== null
                  ? Math.round((section.score - before) * 10) / 10
                  : null;
              return {
                key: section.code,
                label: section.label,
                value: section.score,
                hint: diff === null ? undefined : `전월 대비 ${formatDelta(diff)}`,
              };
            })}
          />
        </section>

        <section className="card p-6">
          <h2 className="text-base font-bold">부서별 종합 점수</h2>
          <p className="mb-4 mt-1 text-sm text-muted">응답 건수가 적은 부서는 해석에 주의하세요.</p>
          <BarList
            showTone
            items={departments.map((dept) => ({
              key: dept.name,
              label: dept.name,
              value: dept.overall,
              count: dept.count,
            }))}
          />
        </section>
      </div>

      {/* ── 부서 × 영역 ──────────────────────────────────── */}
      <section className="card p-6">
        <h2 className="text-base font-bold">부서 × 영역 점수표</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          어느 부서의 어느 영역이 약한지 한눈에 보기 위한 표입니다. 색이 옅을수록 낮은 점수입니다.
        </p>
        <Heatmap
          columns={SCORED_SECTIONS.map((s) => ({ key: s.code, label: s.label }))}
          rows={departments.map((dept) => ({
            key: dept.name,
            label: dept.name,
            count: dept.count,
            values: dept.sections,
          }))}
        />
      </section>

      {/* ── 문항 우선순위 ────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-base font-bold">개선 우선순위 문항</h2>
          <p className="mb-4 mt-1 text-sm text-muted">이번 회차 점수가 가장 낮은 5개 문항입니다.</p>
          <BarList
            items={weakest.map((q) => ({
              key: q.code,
              label: q.prompt,
              value: q.score,
              hint: q.sectionLabel,
            }))}
          />
        </section>

        <section className="card p-6">
          <h2 className="text-base font-bold">잘 유지되고 있는 문항</h2>
          <p className="mb-4 mt-1 text-sm text-muted">이번 회차 점수가 가장 높은 3개 문항입니다.</p>
          <BarList
            items={strongest.map((q) => ({
              key: q.code,
              label: q.prompt,
              value: q.score,
              hint: q.sectionLabel,
            }))}
          />
        </section>
      </div>

      {/* ── 최근 제출 ────────────────────────────────────── */}
      <section className="card p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-base font-bold">최근 제출</h2>
          <Link href="/dashboard/responses" className="text-xs font-semibold text-brand">
            전체 보기 →
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {all.slice(0, 6).map((row) => {
            const tone = scoreTone(row.overall_score);
            return (
              <li key={row.id}>
                <Link
                  href={`/dashboard/responses/${row.id}`}
                  className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-gray-50"
                >
                  <span className="w-24 shrink-0 truncate text-sm font-medium">
                    {row.respondent_name}
                  </span>
                  <span className="w-24 shrink-0 truncate text-sm text-muted">
                    {row.department_name}
                  </span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: tone.bg, color: tone.ink }}
                  >
                    {tone.label} {formatScore(row.overall_score)}
                  </span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">
                    {formatDateTime(row.submitted_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function ScoreTile({
  label,
  score,
  delta,
  prevLabel,
}: {
  label: string;
  score: number | null;
  delta: number | null;
  prevLabel: string;
}) {
  const tone = scoreTone(score);
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold leading-none">{formatScore(score)}</span>
        <span className="text-sm text-muted">/ 100</span>
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <span
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
          style={{ background: tone.bg, color: tone.ink }}
        >
          {tone.label}
        </span>
        {delta !== null && (
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ color: delta > 0 ? "#006300" : delta < 0 ? "#9c2b2b" : "#898781" }}
          >
            {formatDelta(delta)} <span className="font-normal text-muted">vs {prevLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="truncate text-2xl font-bold leading-tight">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-2 truncate text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function TrendTable({ summaries }: { summaries: { period: string; overall: number | null; count: number }[] }) {
  return (
    <details className="mt-4">
      <summary className="cursor-pointer text-xs font-semibold text-muted">표로 보기</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-1.5 pr-3 font-semibold">회차</th>
              <th className="py-1.5 pr-3 font-semibold">종합 점수</th>
              <th className="py-1.5 font-semibold">응답 건수</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.period} className="border-b border-line/60">
                <td className="py-1.5 pr-3">{formatPeriod(s.period)}</td>
                <td className="py-1.5 pr-3 font-semibold tabular-nums">{formatScore(s.overall)}</td>
                <td className="py-1.5 tabular-nums text-muted">{s.count}건</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EmptyState({ role }: { role: string }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-bold">아직 열람 가능한 응답이 없습니다</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {role} 계정으로 볼 수 있는 응답이 아직 없습니다. 설문 링크를 구성원에게 공유하시면 제출되는
        대로 이곳에 집계됩니다.
      </p>
      <Link href="/" className="btn-ghost mt-6">
        설문 페이지 열기
      </Link>
    </div>
  );
}
