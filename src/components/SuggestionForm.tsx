"use client";

import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_BODY,
  MAX_NAME,
  MAX_TITLE,
  SUGGESTION_FIELDS,
  SUGGESTION_TOPICS,
  exampleFor,
} from "@/lib/suggestions";
import type { PreparedImage } from "@/lib/prepareImage";
import AttachmentPicker from "./AttachmentPicker";

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
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topicRef = useRef<HTMLDivElement>(null);

  // 고른 주제에 맞춰 제목·세 칸의 예시가 함께 바뀝니다.
  const example = exampleFor(topic);

  const filled = SUGGESTION_FIELDS.every((f) => (body[f.code] ?? "").trim().length > 0);
  const ready = name.trim() && departmentId && topic && title.trim() && filled;

  async function submit() {
    if (!ready || busy || preparing) return;
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
          attachments: images.map(({ name: fileName, data }) => ({ name: fileName, data })),
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
        <h2 className="form-title">제안자</h2>
        <p className="form-desc mt-1">
          채택 시 개별 연락을 드릴 때 사용합니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="form-label">성명</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME))}
              className="field"
              placeholder="홍길동"
              autoComplete="name"
            />
          </label>
          <label className="text-sm">
            <span className="form-label">소속 부서</span>
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
        <h2 className="form-title">어떤 제안인가요?</h2>
        <p className="form-desc mt-1 text-pretty">
          주제를 고르시면 아래 작성 예시가 그에 맞게 바뀝니다.
        </p>
        {/*
          한 덩어리 목록은 칸이 흐려 고르는 맛이 약하고, 두 줄 카드 격자는 무거웠습니다.
          한 줄에 하나씩 둥근 선택지를 쌓고, 고른 것은 테두리·바탕·체크를 함께 바꿔
          분명히 드러나게 합니다.
        */}
        <div role="radiogroup" aria-label="제안 주제" className="mt-4 space-y-2">
          {SUGGESTION_TOPICS.map((option) => {
            const active = topic === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3.5 transition sm:px-5 ${
                  active
                    ? "border-brand bg-brandSoft shadow-[inset_0_0_0_1px_#1f4d8f]"
                    : "border-line bg-white hover:border-brand/40 hover:bg-brandTint"
                }`}
              >
                <input
                  type="radio"
                  name="topic"
                  className="peer sr-only"
                  value={option.value}
                  checked={active}
                  onChange={() => setTopic(option.value)}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[15px] font-bold ${active ? "text-brand" : "text-ink"}`}
                  >
                    {option.label}
                  </span>
                  {/* 좁은 화면에서 「줄일 수 / 있는 비용」처럼 구절 중간에서 끊기지 않도록
                      쉼표 단위로만 줄을 바꿉니다. */}
                  <span
                    className={`mt-0.5 block text-[14px] leading-relaxed ${
                      active ? "text-brand/80" : "text-muted"
                    }`}
                  >
                    {option.hint.split(", ").map((phrase, i, all) => (
                      <Fragment key={phrase}>
                        <span className="inline-block">
                          {phrase}
                          {i < all.length - 1 && ","}
                        </span>
                        {i < all.length - 1 && " "}
                      </Fragment>
                    ))}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 ${
                    active ? "border-brand bg-brand" : "border-gray-300 bg-white"
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    className={`h-3 w-3 text-white transition ${active ? "opacity-100" : "opacity-0"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
              </label>
            );
          })}
        </div>

        <label className="mt-4 block text-sm">
          <span className="form-label">
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
              <span className="text-[13px] font-bold text-brand tabular-nums">0{index + 1}</span>
              <h2 className="form-title">{field.label}</h2>
            </div>
            <p className="form-desc mt-1">{field.prompt}</p>
            <textarea
              value={value}
              onChange={(e) =>
                setBody((prev) => ({ ...prev, [field.code]: e.target.value.slice(0, MAX_BODY) }))
              }
              rows={4}
              className="field mt-3 resize-y leading-relaxed"
              placeholder={`예) ${example[field.code]}`}
            />
            <p className="mt-1.5 text-right text-xs tabular-nums text-muted">
              {value.length} / {MAX_BODY}
            </p>
          </section>
        );
      })}

      <AttachmentPicker
        title="참고 사진"
        hint="현장 사진이나 화면 캡처가 있으면 함께 올려주세요. 최대 5장까지 올릴 수 있습니다."
        images={images}
        onChange={setImages}
        onBusyChange={setPreparing}
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="form-desc">
          {ready ? (
            <>접수된 내용은 검토 후 채택된 의견에 한해 개별 연락드리겠습니다.</>
          ) : (
            <>모든 항목을 입력하시면 제출할 수 있습니다.</>
          )}
        </p>
        <button type="submit" className="btn-primary px-6 py-2.5 text-sm" disabled={!ready || busy || preparing}>
          {busy ? "제출 중…" : preparing ? "사진 담는 중…" : "제안 제출"}
        </button>
      </div>
    </form>
  );
}
