"use client";

/**
 * 브라우저 인쇄로 PDF 를 만듭니다.
 * 서버에서 PDF 를 그리려면 Chromium 을 함께 배포해야 해서 배포 용량이 크게 늘고,
 * 한글 폰트도 따로 심어야 합니다. 인쇄 화면을 다듬는 쪽이 결과물도 낫습니다.
 * (글자가 이미지가 아니라 텍스트로 남아 검색·복사가 됩니다.)
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-ghost px-3 py-1.5 text-xs print:hidden"
    >
      PDF로 저장 · 인쇄
    </button>
  );
}
