"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_STATUSES } from "@/lib/confidential";

/** 고충·신고 처리. 처리 완료로 닫을 때는 무엇을 했는지 적어야 저장됩니다. */
export default function ReportStatusControls({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState(status);
  const [text, setText] = useState(note);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blocked = next === "done" && !text.trim();

  async function save() {
    if (blocked || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next, note: text.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "저장하지 못했습니다.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted">처리 상태</p>
        <div className="flex flex-wrap gap-1.5">
          {REPORT_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setNext(s.value);
                setSaved(false);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                next === s.value
                  ? "border-brand bg-brandSoft text-brand"
                  : "border-line bg-white text-muted hover:border-brand/40 hover:bg-brandTint"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">
          처리 내용
          {next === "done" && <span className="ml-1 font-normal text-[#93441f]">— 필수</span>}
        </span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, 3000));
            setSaved(false);
          }}
          rows={4}
          className="field resize-y text-sm leading-relaxed"
          placeholder="예) 9월 30일 면담 진행. 업무 범위를 재조정하기로 하고 10월 2일 결과를 본인에게 통보함."
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          onClick={() => void save()}
          disabled={blocked || busy}
        >
          {busy ? "저장 중…" : "저장"}
        </button>
        {blocked && (
          <span className="text-xs text-[#93441f]">처리 완료로 바꾸려면 처리 내용을 적어주세요.</span>
        )}
        {saved && <span className="text-xs font-semibold text-green-700">저장했습니다</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
