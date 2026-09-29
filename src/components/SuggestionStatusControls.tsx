"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUGGESTION_STATUSES, isClosed } from "@/lib/suggestions";

interface Props {
  id: string;
  status: string;
  reply: string;
}

/**
 * 제안 처리. 상태와 회신 내용을 같이 저장합니다.
 *
 * 둘을 따로 두지 않은 이유: 상태만 「미채택」으로 바꿔놓고 제안자에게는 아무
 * 말도 안 가는 상태가 제일 나쁩니다. 닫는 상태(채택·미채택·이관)를 고르면
 * 회신 내용을 반드시 적게 합니다.
 */
export default function SuggestionStatusControls({ id, status, reply }: Props) {
  const router = useRouter();
  const [next, setNext] = useState(status);
  const [text, setText] = useState(reply);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const needsReply = isClosed(next);
  const blocked = needsReply && !text.trim();

  async function save() {
    if (blocked || busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next, reply: text.trim() }),
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
          {SUGGESTION_STATUSES.map((s) => {
            const active = next === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  setNext(s.value);
                  setSaved(false);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand bg-brandSoft text-brand"
                    : "border-line bg-white text-muted hover:border-brand/40 hover:bg-brandTint"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-muted">
          제안자에게 회신할 내용
          {needsReply && <span className="ml-1 font-normal text-[#93441f]">— 필수</span>}
        </span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, 2000));
            setSaved(false);
          }}
          rows={4}
          className="field resize-y text-sm leading-relaxed"
          placeholder={
            next === "adopted"
              ? "예) 11월부터 주간보고 양식을 통합합니다. 좋은 제안 감사합니다."
              : next === "routed"
                ? "예) 개인 고충에 해당하여 고충처리위원에게 전달했습니다. 10일 이내에 처리 결과를 통보받으실 수 있습니다."
                : "채택·미채택 이유를 적어주세요. 이 내용이 제안자에게 전달됩니다."
          }
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
          <span className="text-xs text-[#93441f]">
            닫는 상태로 바꾸려면 회신 내용을 적어주세요.
          </span>
        )}
        {saved && <span className="text-xs font-semibold text-green-700">저장했습니다</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
