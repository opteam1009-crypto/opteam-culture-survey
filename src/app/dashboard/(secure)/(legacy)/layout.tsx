import LegacyTabs from "@/components/LegacyTabs";

/**
 * (구) 정기면담: 10월 이전 월별 정기설문·면담 자료.
 * 현황·응답 열람·면담 일정을 메뉴 하나로 묶고, 안에서 탭으로 오갑니다.
 * 주소(/dashboard, /dashboard/responses, /dashboard/interviews)는 그대로입니다.
 */
export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <LegacyTabs />
      {children}
    </div>
  );
}
