"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="text-xs text-muted transition hover:text-ink"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/dashboard/login");
        router.refresh();
      }}
    >
      로그아웃
    </button>
  );
}
