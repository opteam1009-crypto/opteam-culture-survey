"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTERVIEW_TIME_SLOTS } from "@/lib/questions";
import type { InterviewStatus } from "@/lib/queries";

interface Props {
  responseId: string;
  name: string;
  status: InterviewStatus;
  scheduledAt: string | null;
  /** 응답자가 적어낸 희망 일시. 확정할 때 기본값으로 씁니다. */
  first: string;
  second: string;
}

/** 'YYYY-MM-DD HH:MM' → ['YYYY-MM-DD', 'HH:MM'] */
function split(value: string | null): [string, string] {
  const [d = "", t = ""] = (value ?? "").split(" ");
  return [d, t];
}

/**
 * 면담 일정 조작. 상태마다 버튼을 둘까지만 둡니다.
 * 미확정 → 확정 / 취소, 확정 → 변경 / 취소, 취소됨 → 되돌리기.
 * (취소한 뒤 되돌리면 다시 미확정이 되므로 모든 상태를 오갈 수 있습니다.)
 */
export default function InterviewScheduleControls({
  responseId,
  name,
  status,
  scheduledAt,
  first,
  second,
}: Props) {
  const router = useRouter();
  // 확정된 일정이 있으면 그것을, 없으면 1순위 희망을 기본값으로 둡니다.
  const [initialDate, initialTime] = split(scheduledAt || first || second);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "confirm" | "cancel" | "reset", when?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseId, scheduledAt: when }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "처리하지 못했습니다.");
        setBusy(false);
        return;
      }
      setOpen(false);
      setBusy(false);
      router.refresh();
    } catch {
      setError("네트워크 오류로 처리하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        {status === "cancelled" ? (
          <button type="button" className={BTN} onClick={() => void send("reset")} disabled={busy}>
            되돌리기
          </button>
        ) : (
          <>
            <button type="button" className={BTN} onClick={() => setOpen((v) => !v)} disabled={busy}>
              {status === "confirmed" ? "변경" : "확정"}
            </button>
            <button
              type="button"
              className={DANGER}
              onClick={() => {
                if (confirm(`${name} 님의 면담을 취소할까요?\n\n희망 일시 기록은 그대로 남습니다.`)) {
                  void send("cancel");
                }
              }}
              disabled={busy}
            >
              취소
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-line bg-gray-50 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted">날짜</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="field w-auto py-1.5 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="mb-1 block font-semibold text-muted">시간</span>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="field w-auto py-1.5 text-sm"
              >
                <option value="">선택</option>
                {INTERVIEW_TIME_SLOTS.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary px-3 py-1.5 text-xs"
              disabled={busy || !date || !time}
              onClick={() => void send("confirm", `${date} ${time}`)}
            >
              {busy ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

const BTN =
  "rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink transition hover:border-brand/40 hover:bg-brandTint disabled:opacity-50";
const DANGER =
  "rounded-md border border-line bg-white px-2.5 py-1 text-xs font-semibold text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50";
