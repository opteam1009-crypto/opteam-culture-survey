import { redirect } from "next/navigation";

/** 예전 「고충·신고」 주소. 탭이 둘로 나뉘어 노사 고충 탭으로 넘깁니다. */
export default function Page() {
  redirect("/dashboard/grievance");
}
