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
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
          <Link href="/dashboard" className="text-sm font-bold">
            사내 진단 대시보드
          </Link>
          <nav className="flex items-center gap-1">
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
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/?preview=1"
              className="text-xs text-muted transition hover:text-ink"
            >
              설문 화면
            </Link>
            <span className="rounded-full bg-brandSoft px-2.5 py-1 text-xs font-semibold text-brand">
              {ROLE_LABEL[session.role]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-7">{children}</main>
    </div>
  );
}
