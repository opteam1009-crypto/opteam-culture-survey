import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "현황" },
  { href: "/dashboard/responses", label: "응답 열람" },
  { href: "/dashboard/interviews", label: "면담 일정" },
  { href: "/dashboard/settings", label: "설정" },
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
            <Link href="/dashboard" className="shrink-0 text-sm font-bold">
              사내 진단 대시보드
            </Link>
            <nav className="-mx-1 hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-gray-50 hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="hidden text-xs text-muted transition hover:text-ink sm:inline"
              >
                설문 화면
              </Link>
              <span className="rounded-full bg-brandSoft px-2 py-1 text-[11px] font-semibold text-brand sm:px-2.5 sm:text-xs">
                {ROLE_LABEL[session.role]}
              </span>
              <LogoutButton />
            </div>
          </div>

          {/* 좁은 화면 전용 메뉴 줄. 항목이 늘어도 옆으로 밀어 볼 수 있습니다. */}
          <nav className="-mx-1 mt-2 flex items-center gap-1 overflow-x-auto sm:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-gray-50 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="shrink-0 rounded-md px-2.5 py-1.5 text-sm text-muted transition hover:bg-gray-50 hover:text-ink"
            >
              설문 화면
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-5 sm:py-7 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
