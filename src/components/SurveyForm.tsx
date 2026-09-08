"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SCALE_LABELS,
  SECTIONS,
  type Question,
  questionsOfSection,
} from "@/lib/questions";

export interface DepartmentOption {
  id: number;
  name: string;
}

const VISIBILITY_OPTIONS = [
  {
    value: "both",
    title: "대표이사 + 인사책임자",
    hint: "두 분 모두 이 응답을 열람합니다.",
  },
  {
    value: "ceo_only",
    title: "대표이사만",
    hint: "인사책임자에게는 이 응답이 보이지 않습니다.",
  },
  {
    value: "hr_only",
    title: "인사책임자만",
    hint: "대표이사에게는 이 응답이 보이지 않습니다.",
  },
] as const;

interface Props {
  departments: DepartmentOption[];
  period: string;
  periodLabel: string;
}

export default function SurveyForm({ departments, period, periodLabel }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [visibility, setVisibility] = useState<string>("both");
  const [scale, setScale] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const scaleQuestions = useMemo(
    () => SECTIONS.flatMap((s) => questionsOfSection(s.code)).filter((q) => q.type === "scale5"),
    [],
  );
  const answeredCount = scaleQuestions.filter((q) => scale[q.code]).length;
  const progress = Math.round((answeredCount / scaleQuestions.length) * 100);

  const missingProfile = !name.trim() || !departmentId;
  const firstUnanswered = scaleQuestions.find((q) => !scale[q.code]);
  const canSubmit = !missingProfile && !firstUnanswered && !submitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (missingProfile) {
      setError("성명과 소속부서를 입력해 주세요.");
      document.getElementById("profile-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (firstUnanswered) {
      setError("답변하지 않은 문항이 있습니다. 표시된 문항을 확인해 주세요.");
      document.getElementById(`q-${firstUnanswered.code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          departmentId: Number(departmentId),
          visibility,
          scale,
          texts,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "제출에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        setSubmitting(false);
        return;
      }
      router.push(`/thanks?period=${encodeURIComponent(periodLabel)}`);
    } catch {
      setError("네트워크 오류로 제출하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pb-28">
      {/* ── 응답자 정보 ────────────────────────────────────── */}
      <section id="profile-section" className="card mb-5 p-6">
        <h2 className="text-base font-bold">응답자 정보</h2>
        <p className="mt-1 text-sm text-muted">
          집계와 후속 조치를 위해 실명으로 받습니다. 아래에서 이 응답을 누가 볼 수 있는지 직접
          지정하실 수 있습니다.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              성명 <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              autoComplete="name"
              maxLength={40}
            />
            {touched && !name.trim() && (
              <p className="mt-1.5 text-xs font-medium text-red-600">성명을 입력해 주세요.</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="department">
              소속부서 <span className="text-red-600">*</span>
            </label>
            <select
              id="department"
              className="field"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">선택해 주세요</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {touched && !departmentId && (
              <p className="mt-1.5 text-xs font-medium text-red-600">소속부서를 선택해 주세요.</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <span className="label">이 응답의 열람 범위</span>
          <p className="-mt-0.5 mb-2.5 text-xs text-muted">
            선택하신 범위 밖의 사람에게는 이 응답이 표시되지 않습니다.
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {VISIBILITY_OPTIONS.map((option) => {
              const active = visibility === option.value;
              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border px-3.5 py-3 transition ${
                    active
                      ? "border-brand bg-brandSoft ring-2 ring-brand/15"
                      : "border-line bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    className="sr-only"
                    value={option.value}
                    checked={active}
                    onChange={() => setVisibility(option.value)}
                  />
                  <span className={`block text-sm font-semibold ${active ? "text-brand" : "text-ink"}`}>
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted">{option.hint}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 문항 ──────────────────────────────────────────── */}
      {SECTIONS.map((section, sectionIndex) => {
        const questions = questionsOfSection(section.code);
        if (questions.length === 0) return null;
        return (
          <section key={section.code} className="card mb-5 p-6">
            <header className="mb-1 flex items-baseline gap-2.5">
              <span className="text-xs font-bold tabular-nums text-brand">
                {String(sectionIndex + 1).padStart(2, "0")}
              </span>
              <h2 className="text-base font-bold">{section.label}</h2>
            </header>
            <p className="mb-5 text-sm text-muted">{section.description}</p>

            <div className="divide-y divide-line">
              {questions.map((question) =>
                question.type === "scale5" ? (
                  <ScaleRow
                    key={question.code}
                    question={question}
                    value={scale[question.code]}
                    invalid={touched && !scale[question.code]}
                    onChange={(v) => setScale((prev) => ({ ...prev, [question.code]: v }))}
                  />
                ) : (
                  <TextRow
                    key={question.code}
                    question={question}
                    value={texts[question.code] ?? ""}
                    onChange={(v) => setTexts((prev) => ({ ...prev, [question.code]: v }))}
                  />
                ),
              )}
            </div>
          </section>
        );
      })}

      {/* ── 하단 고정 제출 바 ──────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-5 py-3.5">
          {error && (
            <p className="mb-2.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span>
                  {periodLabel} 진단 · 필수 문항 {answeredCount}/{scaleQuestions.length}
                </span>
                <span className="font-semibold tabular-nums">{progress}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary shrink-0" disabled={!canSubmit}>
              {submitting ? "제출 중…" : "제출하기"}
            </button>
          </div>
        </div>
      </div>

      <input type="hidden" name="period" value={period} />
    </form>
  );
}

function ScaleRow({
  question,
  value,
  invalid,
  onChange,
}: {
  question: Question;
  value: number | undefined;
  invalid: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div
      id={`q-${question.code}`}
      className={`scroll-mt-24 py-4 ${invalid ? "-mx-3 rounded-lg bg-red-50/60 px-3" : ""}`}
    >
      <p className="text-sm font-medium leading-relaxed">
        {question.prompt}
        {invalid && <span className="ml-1.5 text-xs font-bold text-red-600">미응답</span>}
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {SCALE_LABELS.map((option) => {
          const active = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-1 py-2.5 text-center transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white hover:border-brand/40 hover:bg-brandSoft"
              }`}
            >
              <input
                type="radio"
                name={question.code}
                className="sr-only"
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
              />
              <span className="block text-sm font-bold tabular-nums">{option.value}</span>
              <span
                className={`mt-0.5 block text-[11px] leading-tight ${active ? "text-white/85" : "text-muted"}`}
              >
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TextRow({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (value: string) => void;
}) {
  const MAX = 2000;
  return (
    <div className="py-4">
      <label className="block text-sm font-medium leading-relaxed" htmlFor={`q-${question.code}`}>
        {question.prompt}
        <span className="ml-1.5 text-xs font-normal text-muted">(선택)</span>
      </label>
      <textarea
        id={`q-${question.code}`}
        className="field mt-2.5 min-h-[104px] resize-y leading-relaxed"
        value={value}
        maxLength={MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="자유롭게 작성해 주세요."
      />
      <p className="mt-1 text-right text-xs tabular-nums text-muted">
        {value.length}/{MAX}
      </p>
    </div>
  );
}
