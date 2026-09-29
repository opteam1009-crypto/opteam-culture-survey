"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * 대시보드 메뉴. 설문과 상시 접수(제안·괴롭힘 신고·노사 고충)를 묶음으로 나누고
 * 사이에 구분선을 둡니다. 메뉴가 일곱 개라 지금 어디에 있는지가 보여야 합니다.
 */
export default function DashboardNav({ groups }: { groups: NavItem[][] }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {groups.map((group, gi) => (
        <span key={gi} className="flex shrink-0 items-center gap-1">
          {gi > 0 && <span aria-hidden className="mx-1.5 h-4 w-px shrink-0 bg-line" />}
          {group.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm transition ${
                  active
                    ? "bg-brandSoft font-semibold text-brand"
                    : "text-muted hover:bg-gray-50 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </span>
      ))}
    </>
  );
}
