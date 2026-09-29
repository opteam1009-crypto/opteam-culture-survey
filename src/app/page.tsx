import Link from "next/link";
import { loadActiveDepartments } from "@/lib/queries";
import { PROGRAM } from "@/lib/suggestions";
import SuggestionForm from "@/components/SuggestionForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: PROGRAM.name,
  description: "회사 발전을 위한 제안을 상시 접수합니다.",
};

/** 제안 화면에서 안내하는 전담 창구. 누르면 각 접수 화면으로 갑니다. */
const ROUTES = [
  {
    href: "/grievance",
    label: "개인 고충",
    to: "노사협의회 고충처리위원",
    note: "접수일로부터 10일 이내에 처리 결과를 알려드립니다",
  },
  {
    href: "/harassment",
    label: "직장 내 괴롭힘",
    to: "직장 내 괴롭힘 신고 창구",
    note: "접수 즉시 회사가 사실관계를 확인합니다",
  },
];

/**
 * 제안 접수(공개).
 *
 * 폼 위에 어떤 제안을 받는지, 그리고 개인 고충·괴롭힘은 어디로 접수하는지를
 * 먼저 안내합니다. 이 창구가 개인 갈등을 대신 풀어주는 자리로 굳어지면
 * 정기설문을 접은 의미가 없어서입니다.
 *
 * 문구 원칙
 * - 막는 말이 아니라 길을 알려주는 말로 씁니다. 「여기서는 안 받는다」는 제안
 *   자체를 망설이게 합니다.
 * - 회사 공식 안내문의 결로 씁니다. 구어체·과장된 표현은 가볍게 읽힙니다.
 * - 한 줄에 들어가는 문장은 억지로 끊지 않습니다. 긴 문장은 text-pretty 가
 *   줄 끝에 한 단어만 남지 않게 맞춥니다.
 */
export default async function SuggestPage() {
  const departments = await loadActiveDepartments();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-5 sm:py-12">
      <header className="card overflow-hidden">
        {/*
          머리말은 아래 안내 문단과 같은 왼쪽 선에 맞춥니다. 설명은 폭을 좁히지 않고
          카드 끝까지 쓰게 해, 왼쪽에 짧은 줄만 몰려 보이지 않게 합니다.
        */}
        <div className="bg-gradient-to-br from-brand via-[#24589f] to-accent px-6 py-10 text-white sm:px-9 sm:py-12">
          <p className="text-xs font-semibold tracking-wider text-white/70">상시 접수</p>
          <h1 className="mt-2 text-balance text-[26px] font-bold leading-tight sm:text-[30px]">
            {PROGRAM.name}
          </h1>
          <p className="mt-4 text-pretty text-[15px] leading-[1.8] text-white/85">
            {/* 「보고하며,」에서 끊습니다. 첫 줄이 한 번에 들어가는 넓은 화면에서만 끊고,
                좁은 화면은 자연스럽게 흐르게 둡니다(억지로 끊으면 짧은 줄이 생깁니다). */}
            회사 발전을 위한 제안을 상시 접수합니다. 기획운영팀이 매월 취합해 대표님께 보고하며,
            <br className="hidden md:inline" /> 검토 결과는 제안자께 회신드립니다.
          </p>
        </div>

        <div className="divide-y divide-line">
          <Notice title="접수 대상">
            업무·절차 개선, 비용 절감, 보고·지시 체계, 회사 방향, 매출 증대 등 회사 발전에 도움이
            되는 제안이라면 규모와 관계없이 접수합니다.
          </Notice>

          <Notice title="개인 고충과 직장 내 괴롭힘은 전담 창구에서 처리합니다">
            담당자가 별도로 확인하고 신속하게 처리할 수 있도록 아래 창구로 접수해 주세요.
            <span className="mt-3.5 block space-y-2">
              {ROUTES.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="block rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] leading-relaxed transition hover:bg-brandTint hover:ring-1 hover:ring-brand/30"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <b className="text-ink">{r.label}</b>
                    <span aria-hidden className="text-muted">
                      →
                    </span>
                    <b className="text-brand">{r.to}</b>
                    <span className="ml-auto text-xs font-semibold text-brand">바로가기 ›</span>
                  </span>
                  <span className="mt-0.5 block text-muted">{r.note}</span>
                </Link>
              ))}
            </span>
          </Notice>

          <Notice title="채택된 제안에는 포상이 있습니다">
            검토 결과를 회신드리기 위해 성함과 소속을 함께 받고 있습니다.
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
