import type { Metadata } from "next";
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
