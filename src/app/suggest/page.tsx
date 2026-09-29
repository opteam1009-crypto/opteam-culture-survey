import { loadActiveDepartments } from "@/lib/queries";
import SuggestionForm from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "성장 제안제도",
  description: "회사를 더 좋게 만들 아이디어를 언제든 보내주세요.",
};

/**
 * 성장 제안 접수(공개).
 *
 * 폼 위에 어떤 제안을 기다리는지, 그리고 개인적인 어려움은 어디서 도움받을 수
 * 있는지를 먼저 안내합니다. 이 창구가 개인 갈등을 대신 풀어주는 자리로 굳어지면
 * 정기설문을 접은 의미가 없어서입니다.
 *
 * 다만 직원에게는 「여기서는 안 받는다」가 아니라 「더 잘 도와줄 곳이 있다」로
 * 읽혀야 합니다. 거절하는 말투는 제안 자체를 망설이게 만듭니다. 문구를 고칠 때는
 * 막는 말이 아니라 길을 알려주는 말인지 먼저 봐주세요.
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
            회사를 더 좋게 만들 아이디어를 기다립니다. 언제든 편하게 보내주시면
            기획운영팀이 매월 모아 대표님께 전달하고, 검토 결과를 직접 알려드립니다.
          </p>
        </div>

        <div className="divide-y divide-line">
          <Notice title="이런 제안을 기다립니다">
            불필요한 업무·절차·비용, 비효율적인 보고·지시 체계, 회사 방향, 매출 증대처럼
            회사가 더 잘 돌아가게 만드는 아이디어라면 무엇이든 좋습니다. 작은 것도 괜찮습니다.
          </Notice>

          <Notice title="개인적인 어려움은 전담 창구에서 도와드립니다">
            동료 관계나 개인적인 고충처럼 한 분 한 분의 상황을 살펴야 하는 이야기는 전담
            창구에서 더 세심하고 빠르게 도와드릴 수 있습니다.
            <span className="mt-3 block space-y-1.5">
              <Route
                label="개인 고충"
                to="노사협의회 고충처리위원"
                note="10일 이내에 처리 결과를 알려드립니다"
              />
              <Route
                label="직장 내 괴롭힘"
                to="직장 내 괴롭힘 신고 창구"
                note="신고하시면 회사가 지체 없이 확인합니다"
              />
            </span>
          </Notice>

          <Notice title="채택된 제안에는 포상이 있습니다">
            검토 결과는 제안해 주신 분께 직접 알려드립니다. 그래서 성함과 소속을 함께 받고
            있습니다.
          </Notice>
        </div>
      </header>

      <div className="mt-5">
        <SuggestionForm departments={departments} />
      </div>
    </main>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 sm:px-8">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1.5 text-[14px] leading-[1.75] text-ink/70">{children}</p>
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
