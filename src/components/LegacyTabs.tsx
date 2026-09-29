"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "현황", exact: true },
  { href: "/dashboard/responses", label: "응답 열람", exact: false },
  { href: "/dashboard/interviews", label: "면담 일정", exact: false },
];

/** (구) 정기면담 안의 세 화면을 오가는 탭. */
export default function LegacyTabs() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 print:hidden">
      <span className="text-xs font-semibold text-muted">(구) 정기면담</span>
      <div className="flex gap-1 rounded-xl border border-line bg-white p-0.5 text-xs font-semibold">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 transition ${
                active ? "bg-brand text-white" : "text-muted hover:bg-gray-50"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
