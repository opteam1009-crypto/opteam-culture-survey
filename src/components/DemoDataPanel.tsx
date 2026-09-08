"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoDataPanel({ demoCount }: { demoCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"seed" | "clear" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "seed" | "clear") {
    if (action === "clear" && !confirm("예시 데이터를 전부 삭제할까요? 실제 응답은 그대로 남습니다.")) {
      return;
    }
    setBusy(action);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(
        action === "seed"
          ? `예시 응답 ${data.responses}건을 ${data.periods?.length ?? 0}개 회차에 걸쳐 만들었습니다.`
          : `예시 응답 ${data.removed}건을 삭제했습니다.`,
      );
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-muted">
        대시보드가 실제로 어떻게 보이는지 확인하기 위한 가짜 응답입니다. 최근 6개 회차에 걸쳐
        약 60건이 만들어지고, 이름 앞에 <b className="text-ink">[예시]</b> 가 붙습니다. 언제든
        한 번에 지울 수 있고 실제 응답은 건드리지 않습니다.
      </p>

      {demoCount > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-900">
          현재 예시 응답 {demoCount}건이 집계에 포함되어 있습니다.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary px-3.5 py-2 text-xs"
          disabled={busy !== null}
          onClick={() => run("seed")}
        >
          {busy === "seed" ? "만드는 중…" : demoCount > 0 ? "예시 데이터 다시 만들기" : "예시 데이터 만들기"}
        </button>
        {demoCount > 0 && (
          <button
            type="button"
            className="btn-ghost px-3.5 py-2 text-xs"
            disabled={busy !== null}
            onClick={() => run("clear")}
          >
            {busy === "clear" ? "삭제 중…" : "예시 데이터 전체 삭제"}
          </button>
        )}
      </div>

      {message && <p className="mt-2.5 text-sm font-medium text-brand">{message}</p>}
      {error && <p className="mt-2.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
