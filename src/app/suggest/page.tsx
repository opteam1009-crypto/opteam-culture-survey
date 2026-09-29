import { redirect } from "next/navigation";

/**
 * 예전 제안 화면 주소. 업무·제도 개선 창구가 기본 주소(/)로 옮겨가서 넘겨줍니다.
 * 이미 공지한 /suggest 링크가 깨지지 않게 남겨둡니다.
 */
export default function Page() {
  redirect("/");
}
