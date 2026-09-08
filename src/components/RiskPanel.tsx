import Link from "next/link";
import type { FlaggedAnswer, RiskBreakdown } from "@/lib/queries";

// 심각도별 색은 dataviz 상태 팔레트를 쓰고, 항상 보기 문구와 건수를 함께 적어
// 색만으로 의미가 전달되지 않도록 합니다.
const SEVERITY_STYLE: Record<number, { bar: string; bg: string; ink: string }> = {
  0: { bar: "#d7d6d0", bg: "#f0efec", ink: "#52514e" },
  1: { bar: "#ec835a", bg: "#fdeee7", ink: "#93441f" },
  2: { bar: "#d03b3b", bg: "#fbeaea", ink: "#9c2b2b" },
};

export default function RiskPanel({
  breakdown,
  flagged,
}: {
  breakdown: RiskBreakdown[];
  flagged: FlaggedAnswer[];
}) {
  const totalConcerned = breakdown.reduce((a, b) => a + b.concerned, 0);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">조직 리스크 체크</h2>
        <span className="text-xs text-muted">
          {totalConcerned === 0
            ? "이번 회차에 표시된 신호 없음"
            : `주의 이상 응답 ${totalConcerned}건`}
        </span>
      </div>
      <p className="mb-5 mt-1 text-sm text-muted">
        점수 평균에 섞이면 묻히는 항목이라 따로 셉니다. 한 명의 &ldquo;있다&rdquo;가 평균보다
        중요할 수 있습니다.
      </p>

      <div className="space-y-5">
        {breakdown.map((item) => (
          <div key={item.code}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs tabular-nums text-muted">응답 {item.total}건</p>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.prompt}</p>

            {item.total === 0 ? (
              <p className="mt-2 text-xs text-muted">아직 응답이 없습니다.</p>
            ) : (
              <>
                <div className="mt-2.5 flex h-3 gap-[2px] overflow-hidden rounded">
                  {item.buckets.map((bucket) =>
                    bucket.count === 0 ? null : (
                      <div
                        key={bucket.label}
                        className="h-full first:rounded-l last:rounded-r"
                        style={{
                          width: `${(bucket.count / item.total) * 100}%`,
                          background: SEVERITY_STYLE[bucket.severity].bar,
                        }}
                      />
                    ),
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {item.buckets.map((bucket) => (
                    <li key={bucket.label} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-sm"
                        style={{ background: SEVERITY_STYLE[bucket.severity].bar }}
                      />
                      <span className="text-muted">{bucket.label}</span>
                      <span className="font-semibold tabular-nums">{bucket.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>

      {flagged.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-bold">확인이 필요한 응답</h3>
          <p className="mb-3 mt-1 text-xs text-muted">
            아래 응답자는 리스크 문항에 신호를 남겼습니다. 1:1 면담에서 우선 확인해 보세요.
          </p>
          <ul className="space-y-1.5">
            {flagged.map((item, index) => {
              const tone = SEVERITY_STYLE[item.severity];
              return (
                <li key={`${item.responseId}-${item.label}-${index}`}>
                  <Link
                    href={`/dashboard/responses/${item.responseId}`}
                    className="-mx-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg px-2 py-2 transition hover:bg-gray-50"
                  >
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{ background: tone.bg, color: tone.ink }}
                    >
                      {item.severity >= 2 ? "경고" : "주의"}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted">{item.department}</span>
                    <span className="ml-auto text-xs text-muted">
                      {item.label} · <b className="font-semibold text-ink">{item.answer}</b>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
