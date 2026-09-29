import { redirect } from "next/navigation";

/**
 * 대시보드 첫 화면. 로그인하거나 /dashboard 를 열면 세 창구(업무·제도 개선,
 * 괴롭힘 신고, 노사 고충)를 한눈에 보는 「종합」부터 보여줍니다.
 * 예전 설문 현황은 「(구) 정기면담」(/dashboard/overview)에 있습니다.
 */
export default function DashboardHome() {
  redirect("/dashboard/summary");
}
