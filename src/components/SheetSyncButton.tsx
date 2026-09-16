"use client";

import { useState } from "react";

interface Props {
  /** 지금 화면에 걸린 조건. 보이는 것과 보내는 것을 같게 맞춥니다. */
  period: string;
  dept: string;
  count: number;
}

/**
 * 구글 시트로 한 번에 밀어 넣습니다.
 *
 * 자동 전송이 아니라 버튼인 이유: 이미 쓰고 있는 시트에 우리가 마음대로
 * 쓰기 시작하면 언제 무엇이 바뀌었는지 알 수 없습니다. 누를 때만, 그리고
 * 화면에 보이는 범위만 올립니다.
 *
 * 같은 회차·같은 사람은 덮어쓰므로 여러 번 눌러도 행이 늘지 않습니다.
 */
export default function SheetSyncButton({ period, dept, count }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const scope = [period || "전체 회차", dept || "전체 부서"].join(" · ");
    if (!confirm(`${scope} ${count}명을 구글 시트로 보낼까요?\n\n이미 올라간 사람은 덮어씁니다.`)) {
      return;
    }
    setBusy(true);
    setDone(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/sheets-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, dept }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        updated?: number;
        appended?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "보내지 못했습니다.");
        return;
      }
      setDone(`새로 ${data.appended ?? 0}명, 갱신 ${data.updated ?? 0}명`);
    } catch {
      setError("네트워크 오류로 보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <button type="button" onClick={() => void run()} disabled={busy} className="btn-ghost py-2 text-sm disabled:opacity-50">
        {busy ? "보내는 중…" : "시트로 보내기"}
      </button>
      {done && <span className="text-xs font-semibold text-green-700">시트 반영 완료 · {done}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
