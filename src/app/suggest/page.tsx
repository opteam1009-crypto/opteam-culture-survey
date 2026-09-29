import { loadActiveDepartments } from "@/lib/queries";
import { PROGRAM } from "@/lib/suggestions";
import { CONFIDENTIAL_CHANNELS, confidentialReady } from "@/lib/confidential";

/**
 * 제안 화면에서 안내하는 전담 창구.
 * 받는 사람이 등록된 창구만 링크가 됩니다. 아직이면 안내 문구만 보입니다.
 */
const ROUTES = [
  {
    kind: "grievance" as const,
    label: "개인 고충",
    to: "노사협의회 고충처리위원",
    note: "10일 이내에 처리 결과를 알려드립니다",
  },
  {
    kind: "harassment" as const,
    label: "직장 내 괴롭힘",
    to: "직장 내 괴롭힘 신고 창구",
    note: "신고하시면 회사가 지체 없이 확인합니다",
  },
];
import SuggestionForm from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: PROGRAM.name,
  description: "회사를 더 좋게 만들 아이디어를 언제든 보내주세요.",
};

/**
 * 제안 접수(공개).
 *
 * 폼 위에 어떤 제안을 기다리는지, 그리고 개인적인 어려움은 어디서 도움받을 수
 * 있는지를 먼저 안내합니다. 이 창구가 개인 갈등을 대신 풀어주는 자리로 굳어지면
 * 정기설문을 접은 의미가 없어서입니다.
 *
 * 다만 직원에게는 「여기서는 안 받는다」가 아니라 「더 잘 도와줄 곳이 있다」로
 * 읽혀야 합니다. 거절하는 말투는 제안 자체를 망설이게 만듭니다. 문구를 고칠 때는
 * 막는 말이 아니라 길을 알려주는 말인지 먼저 봐주세요.
 *
 * 줄바꿈: 문장이 끝나는 곳에서는 항상 끊고, 문장 중간은 넓은 화면에서만 끊습니다
 * (<br className="hidden sm:inline" />). 좁은 화면에서 억지로 끊으면 한두 글자만
 * 다음 줄로 떨어집니다. 나머지는 text-pretty 가 줄 끝에 한 단어만 남지 않게 맞춥니다.
 */
export default async function SuggestPage() {
  const departments = await loadActiveDepartments();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-12">
      <header className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand via-[#24589f] to-accent px-6 py-9 text-white sm:px-9 sm:py-11">
          <p className="text-xs font-semibold tracking-wider text-white/70">상시 접수</p>
          <h1 className="mt-2 text-balance text-[26px] font-bold leading-tight sm:text-[30px]">
            {PROGRAM.name}
          </h1>
          <p className="mt-4 text-pretty text-[15px] leading-[1.8] text-white/85">
            회사를 더 좋게 만들 아이디어를 기다립니다.
            <br />
            언제든 편하게 보내주시면 기획운영팀이 매월 모아 대표님께 전달하고,
            <br className="hidden sm:inline" /> 검토 결과를 직접 알려드립니다.
          </p>
        </div>

        <div className="divide-y divide-line">
          <Notice title="이런 제안을 기다립니다">
            회사가 더 잘 돌아가게 만드는 아이디어라면 무엇이든 좋습니다.
            <br />
            작은 개선이라도 편하게 보내주세요.
          </Notice>

          <Notice title="개인적인 어려움은 전담 창구에서 도와드립니다">
            동료 관계나 개인적인 고충처럼 한 분 한 분의 상황을 살펴야 하는 이야기는
            <br className="hidden sm:inline" /> 전담 창구에서 더 세심하고 빠르게 도와드릴 수
            있습니다.
            <span className="mt-3.5 block space-y-2">
              {ROUTES.map((r) => (
                <Route
                  key={r.kind}
                  label={r.label}
                  to={r.to}
                  note={r.note}
                  href={confidentialReady(r.kind) ? CONFIDENTIAL_CHANNELS[r.kind].path : ""}
                />
              ))}
            </span>
          </Notice>

          <Notice title="채택된 제안에는 포상이 있습니다">
            검토 결과는 제안해 주신 분께 직접 알려드립니다.
            <br />
            이를 위해 성함과 소속을 함께 받고 있습니다.
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
    <div className="px-6 py-5 sm:px-9 sm:py-6">
      <p className="text-[15px] font-bold text-ink">{title}</p>
      <p className="mt-2 text-pretty text-[14px] leading-[1.8] text-ink/70">{children}</p>
    </div>
  );
}

/**
 * 창구 안내 한 줄. 좁은 화면에서는 「어디로」와 「무엇을 해주는지」를
 * 두 줄로 나눠, 설명이 창구 이름 사이에 끼어 읽히지 않게 합니다.
 */
function Route({
  label,
  to,
  note,
  href,
}: {
  label: string;
  to: string;
  note: string;
  href: string;
}) {
  const body = (
    <>
      <span className="flex flex-wrap items-baseline gap-x-2">
        <b className="text-ink">{label}</b>
        <span aria-hidden className="text-muted">
          →
        </span>
        <b className="text-brand">{to}</b>
        {href && (
          <span className="ml-auto text-xs font-semibold text-brand">바로가기 ›</span>
        )}
      </span>
      <span className="mt-0.5 block text-muted">{note}</span>
    </>
  );

  const box = "block rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] leading-relaxed";
  if (!href) return <span className={box}>{body}</span>;
  return (
    <a href={href} className={`${box} transition hover:bg-brandTint hover:ring-1 hover:ring-brand/30`}>
      {body}
    </a>
  );
}
