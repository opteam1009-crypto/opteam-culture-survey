import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { currentPeriod, formatDateTime, formatPeriod } from "@/lib/period";
import { loadReports, loadSuggestions } from "@/lib/queries";
import { PROGRAM, STATUS_LABEL, isClosed } from "@/lib/suggestions";
import {
  GRIEVANCE_DEADLINE_DAYS,
  REPORT_STATUS_LABEL,
  type ConfidentialReport,
} from "@/lib/confidential";
import { daysSince } from "@/components/ReportDeadline";

export const dynamic = "force-dynamic";

/**
 * 종합 현황. 세 창구(업무·제도 개선, 괴롭힘 신고, 노사 고충)의 진행 상황을 한 화면에.
 *
 * 창구마다 상태 이름이 다르지만(검토중/처리중, 채택/처리 완료 …) 관리자가 알고
 * 싶은 건 결국 「손도 안 댄 것 / 하고 있는 것 / 끝난 것」 입니다. 그래서 세 단계로
 * 묶어 같은 막대로 보여주고, 원래 상태 이름은 범례에 그대로 적습니다.
 *
 * 막대 색은 한 가지 파랑의 세 단계입니다(검증: 단일 색상·밝기 단조·단계 간격·
 * 배경 대비 2:1 이상 통과). 가장 진한 칸이 「접수(아직 손 안 댐)」라 눈이 먼저 갑니다.
 * 끝난 건은 가장 옅게 물러납니다. 색만으로 구분하지 않도록 범례에 글자와 건수를 둡니다.
 */
const STAGE_COLOR = {
  new: "#1f4d8f",
  doing: "#3987e5",
  done: "#86b6ef",
} as const;

type Stage = keyof typeof STAGE_COLOR;

interface ChannelSummary {
  key: string;
  title: string;
  href: string;
  total: number;
  stages: { stage: Stage; label: string; count: number }[];
  /** 카드 맨 아래 한 줄. 세 카드 모두 두어 높이와 줄이 맞도록 합니다. */
  footer: string;
}

interface ActionItem {
  href: string;
  channel: string;
  status: string;
  headline: string;
  who: string;
  submittedAt: string;
  /** 정렬 기준. 작을수록 급합니다. */
  urgency: number;
  flag?: { text: string; tone: "late" | "near" | "plain" };
}

/** 한국 날짜 기준 'YYYY-MM'. */
function seoulMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date(iso))
    .slice(0, 7);
}

export default async function SummaryPage() {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");

  const [suggestions, reports] = await Promise.all([loadSuggestions(), loadReports()]);
  const harassment = reports.filter((r) => r.kind === "harassment");
  const grievance = reports.filter((r) => r.kind === "grievance");
  const month = currentPeriod();

  // ── 창구별 세 단계 ─────────────────────────────────────────────────
  const openHarassment = harassment.filter((r) => r.status !== "done");
  const openGrievance = grievance.filter((r) => r.status !== "done");
  const oldestOpen = openHarassment.length
    ? Math.max(...openHarassment.map((r) => daysSince(r.submitted_at)))
    : null;
  const nearestLeft = openGrievance.length
    ? Math.min(...openGrievance.map((r) => GRIEVANCE_DEADLINE_DAYS - daysSince(r.submitted_at)))
    : null;
  const count = <T,>(rows: T[], pick: (r: T) => boolean) => rows.filter(pick).length;
  const reportChannel = (
    rows: ConfidentialReport[],
    key: string,
    title: string,
    href: string,
    footer: string,
  ): ChannelSummary => ({
    key,
    title,
    href,
    footer,
    total: rows.length,
    stages: [
      { stage: "new", label: "접수", count: count(rows, (r) => r.status === "received") },
      { stage: "doing", label: "처리중", count: count(rows, (r) => r.status === "handling") },
      { stage: "done", label: "처리 완료", count: count(rows, (r) => r.status === "done") },
    ],
  });

  const channels: ChannelSummary[] = [
    {
      key: "suggestions",
      title: PROGRAM.short,
      href: "/dashboard/suggestions",
      total: suggestions.length,
      stages: [
        { stage: "new", label: "접수", count: count(suggestions, (s) => s.status === "received") },
        { stage: "doing", label: "검토중", count: count(suggestions, (s) => s.status === "reviewing") },
        { stage: "done", label: "회신 완료", count: count(suggestions, (s) => isClosed(s.status)) },
      ],
      footer: `회신 내역 · ${(["adopted", "rejected", "routed"] as const)
        .map((st) => `${STATUS_LABEL[st]} ${count(suggestions, (s) => s.status === st)}`)
        .join(" · ")}`,
    },
    reportChannel(
      harassment,
      "harassment",
      "괴롭힘 신고",
      "/dashboard/harassment",
      oldestOpen === null
        ? "미처리 건이 없습니다"
        : `가장 오래된 미처리 건 · ${oldestOpen === 0 ? "오늘 접수" : `접수 ${oldestOpen}일째`}`,
    ),
    reportChannel(
      grievance,
      "grievance",
      "노사 고충",
      "/dashboard/grievance",
      nearestLeft === null
        ? "미처리 건이 없습니다"
        : `가장 가까운 통보 기한 · ${
            nearestLeft < 0 ? `${-nearestLeft}일 초과` : nearestLeft === 0 ? "오늘까지" : `D-${nearestLeft}`
          }`,
    ),
  ];

  // ── 맨 위 숫자 ─────────────────────────────────────────────────────
  const openTotal = channels.reduce(
    (sum, c) => sum + c.stages.filter((s) => s.stage !== "done").reduce((a, s) => a + s.count, 0),
    0,
  );
  const untouched = channels.reduce(
    (sum, c) => sum + (c.stages.find((s) => s.stage === "new")?.count ?? 0),
    0,
  );
  const deadlineRisk = grievance.filter(
    (r) => r.status !== "done" && daysSince(r.submitted_at) >= GRIEVANCE_DEADLINE_DAYS - 3,
  ).length;
  const receivedThisMonth =
    suggestions.filter((s) => s.period === month).length +
    reports.filter((r) => seoulMonth(r.submitted_at) === month).length;
  const closedThisMonth =
    suggestions.filter((s) => isClosed(s.status) && s.replied_at && seoulMonth(s.replied_at) === month)
      .length +
    reports.filter((r) => r.status === "done" && r.updated_at && seoulMonth(r.updated_at) === month)
      .length;

  // ── 처리할 건 목록 ─────────────────────────────────────────────────
  // 급한 순서: 기한이 걸린 고충 → 괴롭힘 신고(즉시 확인) → 제안(오래된 순).
  // 고충·괴롭힘은 이 화면에 내용을 옮기지 않습니다. 여러 사람이 보는 첫 화면일 수 있어
  // 누가 언제 냈는지만 두고, 내용은 각 탭의 상세에서 봅니다.
  const actions: ActionItem[] = [];
  for (const r of openGrievance) {
    const passed = daysSince(r.submitted_at);
    const left = GRIEVANCE_DEADLINE_DAYS - passed;
    actions.push({
      href: `/dashboard/grievance/${r.id}`,
      channel: "노사 고충",
      status: REPORT_STATUS_LABEL[r.status] ?? r.status,
      headline: "개인 고충 접수",
      who: `${r.department_name} · ${r.reporter_name}`,
      submittedAt: r.submitted_at,
      urgency: left,
      flag:
        left < 0
          ? { text: `통보 기한 ${-left}일 초과`, tone: "late" }
          : { text: left === 0 ? "오늘까지 통보" : `통보 기한 D-${left}`, tone: left <= 3 ? "near" : "plain" },
    });
  }
  for (const r of openHarassment) {
    const passed = daysSince(r.submitted_at);
    actions.push({
      href: `/dashboard/harassment/${r.id}`,
      channel: "괴롭힘 신고",
      status: REPORT_STATUS_LABEL[r.status] ?? r.status,
      headline: "직장 내 괴롭힘 신고",
      who: `${r.department_name} · ${r.reporter_name}`,
      submittedAt: r.submitted_at,
      // 즉시 확인해야 하는 건이라 고충 기한 임박 건 바로 다음에 둡니다.
      urgency: 3.5 - passed / 100,
      flag: {
        text: passed === 0 ? "오늘 접수" : `접수 ${passed}일째`,
        tone: r.status === "received" && passed >= 1 ? "near" : "plain",
      },
    });
  }
  for (const s of suggestions.filter((x) => !isClosed(x.status))) {
    const passed = daysSince(s.submitted_at);
    actions.push({
      href: `/dashboard/suggestions/${s.id}`,
      channel: PROGRAM.short,
      status: STATUS_LABEL[s.status] ?? s.status,
      headline: s.title,
      who: `${s.department_name} · ${s.proposer_name}`,
      submittedAt: s.submitted_at,
      urgency: 100 - passed / 100,
      flag: { text: passed === 0 ? "오늘 접수" : `접수 ${passed}일째`, tone: "plain" },
    });
  }
  actions.sort((a, b) => a.urgency - b.urgency);
  const shown = actions.slice(0, 10);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold">종합 현황</h1>
        <p className="mt-1 text-pretty text-sm text-muted">
          업무·제도 개선, 괴롭힘 신고, 노사 고충의 접수·처리 현황을 한눈에 봅니다.
        </p>
      </header>

      {/*
        ── 맨 위 숫자 셋 ──
        아래 창구 카드와 같은 3칸 격자라 세로 선이 위아래로 맞습니다. 카드 안은
        subgrid 로 「제목 / 숫자 / 설명」 세 줄을 옆 카드와 공유해, 한쪽 제목이나
        설명이 두 줄이 되어도 숫자 줄이 어긋나지 않습니다.
      */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <Stat
          className="col-span-2 sm:col-span-1"
          label="처리할 건"
          value={openTotal}
          note={[
            <>
              이 중 아직 손대지 않은 접수 <b className="text-ink">{untouched}건</b>
            </>,
          ]}
        />
        <Stat
          label="고충 통보 기한 임박"
          value={deadlineRisk}
          note={["남은 기한 3일 이내", "기한 초과 포함"]}
          alert={deadlineRisk > 0}
        />
        <Stat
          label={`${formatPeriod(month)} 접수`}
          value={receivedThisMonth}
          note={[
            "세 창구 합계",
            <>
              처리 완료 <b className="text-ink">{closedThisMonth}건</b>
            </>,
          ]}
        />
      </section>

      {/* ── 창구별 진행 ───────────────────────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-3">
        {channels.map((c) => (
          <ChannelCard key={c.key} c={c} />
        ))}
      </section>

      {/* ── 처리할 건 목록 ────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-bold">처리할 건</h2>
          <p className="text-xs text-muted">
            급한 순서 · 통보 기한이 가까운 고충과 괴롭힘 신고가 먼저
          </p>
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">지금 처리할 건이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {shown.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5 transition hover:bg-brandTint"
                >
                  {/* 넓은 화면: 왼쪽 칸에 창구 이름. 좁은 화면에서는 이 칸이 폭을 먹어
                      날짜가 잘리므로, 창구 이름을 아래 배지 줄로 내립니다. */}
                  <span className="hidden w-[5.5rem] shrink-0 text-xs font-semibold text-muted sm:block">
                    {a.channel}
                  </span>
                  <span className="min-w-0 flex-1 basis-full sm:basis-40">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {a.headline}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted sm:truncate">
                      {a.who} · {formatDateTime(a.submittedAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <span className="rounded bg-brandSoft px-1.5 py-0.5 text-[11px] font-semibold text-brand sm:hidden">
                      {a.channel}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                      {a.status}
                    </span>
                    {a.flag && <Flag flag={a.flag} />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {actions.length > shown.length && (
          <p className="border-t border-line px-5 py-3 text-xs text-muted">
            외 {actions.length - shown.length}건은 각 탭에서 확인하세요.
          </p>
        )}
      </section>
    </div>
  );
}

/**
 * 창구 하나의 진행 막대. 세 단계를 한 줄 막대로, 범례에 이름과 건수를 둡니다.
 * 머리 / 막대 / 범례 / 맨 아래 줄을 옆 카드와 subgrid 로 맞춥니다.
 */
function ChannelCard({ c }: { c: ChannelSummary }) {
  const visible = c.stages.filter((s) => s.count > 0);
  return (
    <div className="card row-span-4 grid grid-rows-subgrid gap-y-0 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <Link href={c.href} className="text-[15px] font-bold text-ink hover:text-brand">
          {c.title} <span aria-hidden className="text-muted">›</span>
        </Link>
        <p className="text-sm text-muted">
          전체 <b className="tabular-nums text-ink">{c.total}</b>건
        </p>
      </div>

      {/* 막대: 두께 14px, 칸 사이 2px 배경 틈, 양 끝만 4px 둥글게 */}
      <div
        className="mt-4 flex h-[14px] gap-[2px]"
        role="img"
        aria-label={`${c.title} ${c.stages.map((s) => `${s.label} ${s.count}건`).join(", ")}`}
      >
        {c.total === 0 ? (
          <div className="h-full w-full rounded bg-gray-100" />
        ) : (
          visible.map((s, i) => (
            <div
              key={s.stage}
              title={`${s.label} ${s.count}건 (${Math.round((s.count / c.total) * 100)}%)`}
              className={`h-full ${i === 0 ? "rounded-l" : ""} ${
                i === visible.length - 1 ? "rounded-r" : ""
              }`}
              style={{ flex: `${s.count} 1 0`, background: STAGE_COLOR[s.stage] }}
            />
          ))
        )}
      </div>

      {/* 범례 = 표. 색만으로 구분하지 않도록 이름과 건수를 함께 둡니다. */}
      <dl className="mt-3.5 grid grid-cols-3 gap-2">
        {c.stages.map((s) => (
          <div key={s.stage} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: STAGE_COLOR[s.stage] }}
              />
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-ink">
              {s.count}
              <span className="ml-0.5 text-xs font-semibold text-muted">건</span>
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3.5 self-end border-t border-line pt-3 text-xs text-muted">{c.footer}</p>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  alert,
  className = "",
}: {
  label: string;
  value: number;
  /** 설명 조각. 좁은 카드에서는 조각마다 줄을 바꿔 구절 중간에서 끊기지 않게 합니다. */
  note: ReactNode[];
  alert?: boolean;
  className?: string;
}) {
  return (
    <div className={`card row-span-3 grid grid-rows-subgrid gap-y-0 p-4 sm:p-5 ${className}`}>
      <p className="text-pretty text-[13px] font-semibold leading-snug text-muted">{label}</p>
      <p
        className={`mt-2.5 text-[34px] font-bold leading-none tabular-nums sm:text-[40px] ${
          alert ? "text-[#93441f]" : "text-ink"
        }`}
      >
        {value}
        <span className="ml-1 text-base font-semibold text-muted">건</span>
      </p>
      <p className="mt-2.5 text-balance text-xs leading-relaxed text-muted">
        {note.map((part, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="hidden lg:inline"> · </span>}
            <span className="block lg:inline">{part}</span>
          </Fragment>
        ))}
      </p>
    </div>
  );
}

function Flag({ flag }: { flag: NonNullable<ActionItem["flag"]> }) {
  const style =
    flag.tone === "late"
      ? { background: "#fbeaea", color: "#9c2b2b" }
      : flag.tone === "near"
        ? { background: "#fdeee7", color: "#93441f" }
        : { background: "#f0efec", color: "#52514e" };
  return (
    <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums" style={style}>
      {flag.text}
    </span>
  );
}
