"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "로그인에 실패했습니다.");
        setBusy(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <label className="label" htmlFor="password">
        비밀번호
      </label>
      <input
        id="password"
        type="password"
        className="field"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        autoFocus
      />
      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" className="btn-primary mt-4 w-full" disabled={busy || !password}>
        {busy ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
