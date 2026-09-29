"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  /** 이 메뉴에 불을 켤 다른 주소들(하위 화면). */
  match?: string[];
}

/**
 * 대시보드 메뉴. 설문과 상시 접수(제안·괴롭힘 신고·노사 고충)를 묶음으로 나누고
 * 사이에 구분선을 둡니다. 메뉴가 일곱 개라 지금 어디에 있는지가 보여야 합니다.
 */
export default function DashboardNav({ groups }: { groups: NavItem[][] }) {
  const pathname = usePathname();

  // 좁은 화면의 메뉴 줄은 옆으로 밀어 보는 구조라, 뒤쪽 메뉴(예: (구) 정기면담)에
  // 있을 때 그 메뉴가 화면 밖에 걸려 있으면 어디에 있는지 모릅니다. 끌어옵니다.
  // 페이지 전체가 아니라 메뉴 줄만 옆으로 움직입니다.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-scroll-nav]").forEach((nav) => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!active) return;
      const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
      nav.scrollTo({ left: Math.max(0, left) });
    });
  }, [pathname]);
  const isActive = (item: NavItem) =>
    (item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)) ||
    (item.match ?? []).some((m) => pathname.startsWith(m));

  return (
    <>
      {groups.map((group, gi) => (
        <span key={gi} className="flex shrink-0 items-center gap-1">
          {gi > 0 && <span aria-hidden className="mx-1.5 h-4 w-px shrink-0 bg-line" />}
          {group.map((item) => {
            const active = isActive(item);
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
