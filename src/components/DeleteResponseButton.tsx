"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 응답 1건 삭제. 되돌릴 수 없으므로 누구의 응답인지 확인시킨 뒤 지웁니다.
 */
export default function DeleteResponseButton({
  id,
  name,
  period,
}: {
  id: string;
  name: string;
  period: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (
      !confirm(
        `${period} · ${name} 님의 응답을 삭제할까요?\n\n답변 내용까지 함께 지워지고 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "삭제하지 못했습니다.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류로 삭제하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
      >
        {busy ? "삭제 중…" : "삭제"}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </>
  );
}
