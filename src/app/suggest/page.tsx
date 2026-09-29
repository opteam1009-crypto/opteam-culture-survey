import { loadActiveDepartments } from "@/lib/queries";
import SuggestionForm from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "성장 제안제도",
  description: "회사를 더 낫게 만드는 제안을 상시로 받습니다.",
};

/**
 * 성장 제안 접수(공개).
 *
 * 폼 위에 「받는 것 / 받지 않는 것」을 먼저 둡니다. 이 창구가 개인 갈등을
 * 대신 해결해 주는 자리로 다시 굳어지면 정기설문을 접은 의미가 없습니다.
 * 다만 받지 않는다고만 하면 갈 곳 없이 막히는 셈이라, 어디로 가야 하는지를
 * 같은 자리에서 알려줍니다.
 */
export default async function SuggestPage() {
  const departments = await loadActiveDepartments();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-12">
      <header className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand via-[#24589f] to-accent px-6 py-8 text-white sm:px-8 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            상시 접수
          </p>
          <h1 className="mt-1.5 text-2xl font-bold sm:text-[28px]">성장 제안제도</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-white/80">
            회사를 더 낫게 만드는 의견을 받습니다. 정해진 기간 없이 언제든 제출하실 수 있고,
            기획운영팀이 월 1회 취합해 대표님께 보고한 뒤 채택 여부를 회신드립니다.
          </p>
        </div>

        <div className="divide-y divide-line">
          <Notice icon="💡" tone="good" title="이런 것을 받습니다">
            불필요한 업무·절차·비용, 비효율적인 보고·지시 체계, 회사 방향, 매출 증대처럼{" "}
            <b className="text-ink">회사를 개선하는 제안</b>입니다. 작은 것이라도 좋습니다.
          </Notice>

          <Notice icon="↪️" tone="warn" title="이런 것은 다른 창구가 있습니다">
            <b className="text-ink">개인 고충이나 특정인에 대한 불만</b>은 여기서 다루지 않습니다.
            제안제도는 채택·포상을 전제로 대표님께 보고되는 자리라, 개인 사안을 올리면 오히려
            제대로 처리되지 않습니다.
            <span className="mt-2.5 block space-y-1.5">
              <Route
                label="개인 고충"
                to="노사협의회 고충처리위원"
                note="접수 후 10일 이내에 처리 결과를 통보받으실 수 있습니다"
              />
              <Route
                label="직장 내 괴롭힘"
                to="직장 내 괴롭힘 신고 창구"
                note="신고가 접수되면 회사가 지체 없이 조사할 의무가 있습니다"
              />
            </span>
          </Notice>

          <Notice icon="🏅" title="채택되면 포상합니다">
            채택 여부는 제안하신 분께 회신드리며, 채택된 제안에는 포상이 있습니다.
            그래서 익명이 아닌 <b className="text-ink">실명</b>으로 받습니다.
          </Notice>
        </div>
      </header>

      <div className="mt-5">
        <SuggestionForm departments={departments} />
      </div>
    </main>
  );
}

function Notice({
  icon,
  title,
  tone,
  children,
}: {
  icon: string;
  title: string;
  tone?: "good" | "warn";
  children: React.ReactNode;
}) {
  // 색만으로 구분하지 않도록 제목을 함께 둡니다.
  const accent =
    tone === "good" ? "text-[#056b05]" : tone === "warn" ? "text-[#93441f]" : "text-ink";
  return (
    <div className="flex gap-3 px-6 py-4 sm:px-7 sm:py-5">
      <span aria-hidden className="shrink-0 text-lg leading-none">
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${accent}`}>{title}</p>
        <p className="mt-1 text-[14px] leading-[1.75] text-ink/75">{children}</p>
      </div>
    </div>
  );
}

function Route({ label, to, note }: { label: string; to: string; note: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg bg-gray-50 px-3 py-2 text-[13px]">
      <b className="text-ink">{label}</b>
      <span aria-hidden className="text-muted">
        →
      </span>
      <b className="text-brand">{to}</b>
      <span className="text-muted">{note}</span>
    </span>
  );
}
