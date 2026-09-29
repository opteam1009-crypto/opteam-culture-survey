import { redirect } from "next/navigation";

/**
 * 대시보드 첫 화면. 10월부터 월별 설문 대신 상시 창구를 운영하므로
 * 로그인하거나 /dashboard 를 열면 업무·제도 개선 창구부터 보여줍니다.
 * 예전 설문 현황은 「(구) 정기면담」(/dashboard/overview)으로 옮겼습니다.
 */
export default function DashboardHome() {
  redirect("/dashboard/suggestions");
}
