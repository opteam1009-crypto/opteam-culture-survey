"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_BODY,
  MAX_NAME,
  MAX_TITLE,
  SUGGESTION_FIELDS,
  SUGGESTION_TOPICS,
  exampleFor,
} from "@/lib/suggestions";

interface Department {
  id: number;
  name: string;
}

/**
 * 성장 제안 접수 폼.
 *
 * 설문 폼과 달리 문항이 없고 한 장짜리입니다. 상시 창구는 "생각났을 때 5분 안에
 * 쓸 수 있어야" 들어오므로, 칸을 늘리지 않고 현황·제안·기대효과 셋만 받습니다.
 */
export default function SuggestionForm({ departments }: { departments: Department[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topicRef = useRef<HTMLDivElement>(null);

  // 고른 주제에 맞춰 제목·세 칸의 예시가 함께 바뀝니다.
  const example = exampleFor(topic);

  const filled = SUGGESTION_FIELDS.every((f) => (body[f.code] ?? "").trim().length > 0);
  const ready = name.trim() && departmentId && topic && title.trim() && filled;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          departmentId: Number(departmentId),
          topic,
          title: title.trim(),
          situation: (body.situation ?? "").trim(),
          proposal: (body.proposal ?? "").trim(),
          expect: (body.expect ?? "").trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "제출하지 못했습니다.");
        setBusy(false);
        return;
      }
      router.push("/suggest/thanks");
    } catch {
      setError("네트워크 오류로 제출하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* ── 제안자 ─────────────────────────────────────────── */}
      <section className="card p-5 sm:p-7">
        <h2 className="text-[15px] font-bold">제안자</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          검토 결과를 직접 알려드릴 때 사용합니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold text-muted">성명</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
              className="field"
              placeholder="홍길동"
              autoComplete="name"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-xs font-semibold text-muted">소속 부서</span>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="field"
            >
              <option value="">선택해 주세요</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ── 주제 ───────────────────────────────────────────── */}
      <section className="card p-5 sm:p-7" ref={topicRef}>
        <h2 className="text-[15px] font-bold">어떤 제안인가요?</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {SUGGESTION_TOPICS.map((option) => {
            const active = topic === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-xl border px-4 py-3.5 transition ${
                  active
                    ? "border-brand bg-brandSoft ring-4 ring-brand/10"
                    : "border-line bg-white hover:border-brand/35 hover:bg-brandTint"
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  className="sr-only"
                  value={option.value}
                  checked={active}
                  onChange={() => setTopic(option.value)}
                />
                <span
                  className={`block text-sm font-bold ${active ? "text-brand" : "text-ink"}`}
                >
                  {option.label}
                </span>
                <span className="mt-1 block text-[13px] leading-relaxed text-ink/65">
                  {option.hint}
                </span>
              </label>
            );
          })}
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-muted">
            한 줄 제목 <span className="font-normal">— 무엇에 대한 제안인지</span>
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
            className="field"
            placeholder={`예) ${example.title}`}
          />
        </label>
      </section>

      {/* ── 1장 양식 ───────────────────────────────────────── */}
      {SUGGESTION_FIELDS.map((field, index) => {
        const value = body[field.code] ?? "";
        return (
          <section key={field.code} className="card p-5 sm:p-7">
            <div className="flex items-baseline gap-2.5">
              <span className="text-xs font-bold text-brand tabular-nums">0{index + 1}</span>
              <h2 className="text-[15px] font-bold">{field.label}</h2>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{field.prompt}</p>
            <textarea
              value={value}
              onChange={(e) =>
                setBody((prev) => ({ ...prev, [field.code]: e.target.value.slice(0, MAX_BODY) }))
              }
              rows={4}
              className="field mt-3 resize-y leading-relaxed"
              placeholder={`예) ${example[field.code]}`}
            />
            <p className="mt-1.5 text-right text-[11px] tabular-nums text-muted">
              {value.length} / {MAX_BODY}
            </p>
          </section>
        );
      })}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-[13px] leading-relaxed text-muted">
          {ready ? (
            <>보내주시면 기획운영팀이 확인하고 결과를 알려드립니다.</>
          ) : (
            <>모든 칸을 채우면 제출할 수 있습니다.</>
          )}
        </p>
        <button type="submit" className="btn-primary px-6 py-2.5 text-sm" disabled={!ready || busy}>
          {busy ? "보내는 중…" : "제안 보내기"}
        </button>
      </div>
    </form>
  );
}
