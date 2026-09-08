"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DepartmentItem {
  id: number;
  name: string;
  active: boolean;
  response_count: number;
}

export default function DepartmentManager({ departments }: { departments: DepartmentItem[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/departments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "처리에 실패했습니다.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {departments.map((dept) => (
          <li key={dept.id} className="flex flex-wrap items-center gap-3 py-2.5">
            {editingId === dept.id ? (
              <>
                <input
                  className="field w-48 py-1.5 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={40}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={busy}
                  onClick={async () => {
                    if (await call("PATCH", { id: dept.id, name: editName })) setEditingId(null);
                  }}
                >
                  저장
                </button>
                <button
                  type="button"
                  className="text-xs text-muted"
                  onClick={() => setEditingId(null)}
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <span className={`text-sm font-medium ${dept.active ? "" : "text-muted line-through"}`}>
                  {dept.name}
                </span>
                <span className="text-xs tabular-nums text-muted">응답 {dept.response_count}건</span>
                {!dept.active && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-muted">
                    비활성
                  </span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    className="text-xs text-brand"
                    onClick={() => {
                      setEditingId(dept.id);
                      setEditName(dept.name);
                    }}
                  >
                    이름 변경
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-ink"
                    disabled={busy}
                    onClick={() => call("PATCH", { id: dept.id, active: !dept.active })}
                  >
                    {dept.active ? "숨기기" : "다시 표시"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <input
          className="field w-52 py-1.5 text-sm"
          placeholder="추가할 부서명"
          value={newName}
          maxLength={40}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary px-3 py-2 text-xs"
          disabled={busy || !newName.trim()}
          onClick={async () => {
            if (await call("POST", { name: newName })) setNewName("");
          }}
        >
          부서 추가
        </button>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        숨긴 부서는 설문 드롭다운에 나오지 않지만 과거 응답과 집계는 그대로 남습니다. 이름을
        바꾸면 과거 응답의 부서명도 함께 갱신되어 추이가 끊기지 않습니다.
      </p>
    </div>
  );
}
