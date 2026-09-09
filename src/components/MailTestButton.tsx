"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  ok: boolean;
  mode: "resend" | "smtp" | null;
  to: string[];
  error?: string;
}

/**
 * 설정이 실제로 되는지 확인하는 가장 확실한 방법은 한 통 보내보는 것입니다.
 * 가짜 설문을 제출해 보지 않고도 연동 상태를 확인할 수 있게 합니다.
 */
export default function MailTestButton({ ready }: { ready: boolean }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/mail-test", { method: "POST" });
      const data = (await res.json()) as Result & { error?: string };
      setResult(data);
      // 발송 기록이 아래 목록에도 바로 보이도록 갱신합니다.
      if (data.ok) router.refresh();
    } catch (err) {
      setResult({
        ok: false,
        mode: null,
        to: [],
        error: err instanceof Error ? err.message : "요청에 실패했습니다.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost px-4" onClick={send} disabled={sending}>
          {sending ? "보내는 중…" : "테스트 메일 보내기"}
        </button>
        {!ready && (
          <span className="text-xs text-muted">
            설정이 끝나지 않아도 눌러보세요. 무엇이 빠졌는지 알려줍니다.
          </span>
        )}
      </div>

      {result && (
        <p
          className={`mt-3 rounded-lg px-3.5 py-3 text-sm leading-relaxed ${
            result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"
          }`}
        >
          {result.ok ? (
            <>
              <b>{result.to.join(", ")}</b> 으로 보냈습니다
              {result.mode && ` (${result.mode === "resend" ? "Resend" : "SMTP"})`}. 메일함을
              확인해 주세요. 몇 분 안에 오지 않으면 스팸함도 확인해 보세요.
            </>
          ) : (
            <>보내지 못했습니다 — {result.error}</>
          )}
        </p>
      )}
    </div>
  );
}
