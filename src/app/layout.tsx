import type { Metadata } from "next";
// Pretendard 를 CDN 이 아니라 패키지에서 직접 번들합니다. 사내망에서 외부 CDN 이
// 막혀도 폰트가 깨지지 않고, unicode-range 서브셋이라 실제로 쓰는 글자 범위만
// 내려받습니다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "사내 업무환경·소통 진단",
  description: "매월 진행하는 사내 업무환경 및 소통 진단 설문",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
