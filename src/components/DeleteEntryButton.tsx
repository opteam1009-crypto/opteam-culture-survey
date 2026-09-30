"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 제안·고충·신고 1건 삭제(목록과 상세 공용). 테스트로 넣어본 접수를 지우기 위한 것이라,
 * 되돌릴 수 없다는 것과 무엇을 지우는지를 확인창에서 한 번 더 보여줍니다.
 *
 * after 가 있으면 지운 뒤 그 주소로 옮깁니다(상세 화면에서 지운 경우 목록으로).
 */
export default function DeleteEntryButton({
  endpoint,
  id,
  question,
  detail,
  warning,
  after,
  className = "",
}: {
  endpoint: "/api/admin/suggestions" | "/api/admin/reports";
  id: string;
  /** 확인창 첫 줄. 예) 이 제안을 삭제할까요? */
  question: string;
  /** 무엇을 지우는지. 예) 기획운영팀 · 홍길동 「주간 보고 양식 통일」 */
  detail: string;
  /** 확인창에 덧붙일 주의 문구 */
  warning?: string;
  after?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const message = [question, detail, "삭제하면 되돌릴 수 없습니다.", warning]
      .filter(Boolean)
      .join("\n\n");
    if (!confirm(message)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "삭제하지 못했습니다.");
        setBusy(false);
        return;
      }
      if (after) router.push(after);
      router.refresh();
    } catch {
      setError("네트워크 오류로 삭제하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <span className={`inline-flex flex-col items-end ${className}`}>
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        {busy ? "삭제 중…" : "삭제"}
      </button>
      {error && <span className="mt-1 text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
