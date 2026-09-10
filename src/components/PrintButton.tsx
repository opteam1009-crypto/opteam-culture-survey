"use client";

/**
 * 브라우저 인쇄로 PDF 를 만듭니다.
 * 서버에서 PDF 를 그리려면 Chromium 을 함께 배포해야 해서 배포 용량이 크게 늘고,
 * 한글 폰트도 따로 심어야 합니다. 인쇄 화면을 다듬는 쪽이 결과물도 낫습니다.
 * (글자가 이미지가 아니라 텍스트로 남아 검색·복사가 됩니다.)
 */
export default function PrintButton({ filename }: { filename?: string }) {
  function run() {
    if (!filename) {
      window.print();
      return;
    }
    // 브라우저는 「PDF로 저장」의 기본 파일명으로 문서 제목을 씁니다.
    // 인쇄하는 동안만 제목을 바꿔 끼우고 끝나면 되돌립니다.
    const previous = document.title;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    document.title = filename;
    window.addEventListener("afterprint", restore);
    window.print();
    // afterprint 를 주지 않는 환경을 대비한 보험입니다.
    window.setTimeout(restore, 60_000);
  }

  return (
    <button type="button" onClick={run} className="btn-ghost px-3 py-1.5 text-xs print:hidden">
      PDF로 저장 · 인쇄
    </button>
  );
}
