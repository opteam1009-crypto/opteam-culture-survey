import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import DashboardNav, { type NavItem } from "@/components/DashboardNav";
import { PROGRAM } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

/**
 * 메뉴 묶음. 지금 운영하는 상시 접수 창구를 앞에, 예전 월별 설문·면담은 뒤에 둡니다.
 * 상시 접수는 창구마다 다루는 사람과 기한이 달라 탭을 따로 두고, 예전 자료는
 * 「(구) 정기면담」 하나로 묶어 안에서 현황·응답 열람·면담 일정 탭으로 오갑니다.
 */
const NAV: NavItem[][] = [
  [
    { href: "/dashboard/suggestions", label: PROGRAM.short },
    { href: "/dashboard/harassment", label: "괴롭힘 신고" },
    { href: "/dashboard/grievance", label: "노사 고충" },
  ],
  [
    {
      href: "/dashboard/overview",
      label: "(구) 정기면담",
      match: ["/dashboard/responses", "/dashboard/interviews"],
    },
  ],
  [{ href: "/dashboard/settings", label: "설정" }],
];

export default async function SecureLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) redirect("/dashboard/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white print:hidden">
        {/*
          좁은 화면에서 한 줄에 다 넣으면 세 줄로 접혀 화면 위쪽을 다 먹습니다.
          제목·계정을 한 줄, 메뉴를 그 아래 한 줄로 두고 메뉴만 옆으로 넘깁니다.
        */}
        <div className="mx-auto max-w-6xl px-4 py-2.5 sm:px-5 sm:py-3.5">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/dashboard/suggestions" className="shrink-0 text-sm font-bold">
              사내 진단 대시보드
            </Link>
            {/* 메뉴가 일곱 개라 넓은 화면(1024px~)에서만 한 줄에 둡니다. */}
            <nav className="-mx-1 hidden items-center lg:flex">
              <DashboardNav groups={NAV} />
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {/* 설문과 제안이 당분간 함께 돕니다. 둘 다 열어볼 수 있어야 합니다. */}
              <Link
                href="/survey"
                className="hidden text-xs text-muted transition hover:text-ink lg:inline"
              >
                설문 화면
              </Link>
              <Link
                href="/"
                className="hidden text-xs text-muted transition hover:text-ink lg:inline"
              >
                제안 화면
              </Link>
              <span className="rounded-full bg-brandSoft px-2 py-1 text-[11px] font-semibold text-brand sm:px-2.5 sm:text-xs">
                {ROLE_LABEL[session.role]}
              </span>
              <LogoutButton />
            </div>
          </div>

          {/* 좁은 화면 전용 메뉴 줄. 항목이 늘어도 옆으로 밀어 볼 수 있습니다. */}
          <nav className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto lg:hidden">
            <DashboardNav groups={NAV} />
            <span aria-hidden className="mx-1.5 h-4 w-px shrink-0 bg-line" />
            <Link
              href="/survey"
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-gray-50 hover:text-ink"
            >
              설문 화면
            </Link>
            <Link
              href="/"
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-gray-50 hover:text-ink"
            >
              제안 화면
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-7 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
