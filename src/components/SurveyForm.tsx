"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ANSWERABLE_REQUIRED,
  QUESTION_NUMBER,
  SECTIONS,
  TENURE_OPTIONS,
  VISIBILITY_OPTIONS,
  type Question,
  questionsOfSection,
  scaleLabelsFor,
} from "@/lib/questions";

export interface DepartmentOption {
  id: number;
  name: string;
}

interface Props {
  departments: DepartmentOption[];
  periodLabel: string;
}

export default function SurveyForm({ departments, periodLabel }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [tenure, setTenure] = useState("");
  const [visibility, setVisibility] = useState("both");
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const requiredTexts = useMemo(
    () => SECTIONS.flatMap((s) => questionsOfSection(s.code)).filter(
      (q) => q.type === "text" && q.required,
    ),
    [],
  );

  const answered = ANSWERABLE_REQUIRED.filter((q) => choices[q.code]).length;
  const progress = Math.round((answered / ANSWERABLE_REQUIRED.length) * 100);

  const missingProfile = !name.trim() || !departmentId || !tenure;
  const firstUnanswered = ANSWERABLE_REQUIRED.find((q) => !choices[q.code]);
  const firstEmptyText = requiredTexts.find((q) => !(texts[q.code] ?? "").trim());

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (missingProfile) {
      setError("성명·소속 부서·근속기간을 모두 입력해 주세요.");
      scrollTo("profile-section");
      return;
    }
    if (firstUnanswered) {
      setError("답변하지 않은 문항이 있습니다. 표시된 문항을 확인해 주세요.");
      scrollTo(`q-${firstUnanswered.code}`);
      return;
    }
    if (firstEmptyText) {
      setError("1:1 면담 희망 일시를 입력해 주세요.");
      scrollTo(`q-${firstEmptyText.code}`);
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
          tenure,
          visibility,
          choices,
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
      <section id="profile-section" className="card mb-5 scroll-mt-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">
              성명 <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해 주세요"
              autoComplete="name"
              maxLength={40}
            />
            {touched && !name.trim() && <FieldError>성명을 입력해 주세요.</FieldError>}
          </div>
          <div>
            <label className="label" htmlFor="department">
              소속 부서 <span className="text-red-600">*</span>
            </label>
            <select
              id="department"
              className="field"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">예: 기획운영팀</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {touched && !departmentId && <FieldError>소속 부서를 선택해 주세요.</FieldError>}
          </div>
        </div>

        <div className="mt-6">
          <span className="label">
            근속기간 <span className="text-red-600">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {TENURE_OPTIONS.map((option) => (
              <Chip
                key={option}
                label={option}
                active={tenure === option}
                onSelect={() => setTenure(option)}
              />
            ))}
          </div>
          {touched && !tenure && <FieldError>근속기간을 선택해 주세요.</FieldError>}
        </div>

        <div className="mt-6">
          <span className="label">이 응답의 열람 범위를 선택해 주세요</span>
          <div className="grid gap-2.5 sm:grid-cols-2">
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
          <p className="mt-2.5 rounded-lg bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-muted">
            인사책임자를 거치지 않고 대표이사에게 직접 전달하고 싶은 내용이 있다면{" "}
            <b className="text-ink">「대표이사만 열람」</b>을 선택해 주세요. 선택 시 인사책임자는 이
            응답을 볼 수 없습니다.
          </p>
        </div>
      </section>

      {/* ── 문항 ──────────────────────────────────────────── */}
      {SECTIONS.map((section) => {
        const questions = questionsOfSection(section.code);
        if (questions.length === 0) return null;
        const showScale = questions.some((q) => q.type === "scale5");
        const labels = scaleLabelsFor(section.code);

        return (
          <section key={section.code} className="card mb-5 p-6">
            <header className="mb-1 flex items-baseline gap-2.5">
              <span className="text-xs font-bold tabular-nums text-brand">{section.index}</span>
              <h2 className="text-base font-bold">{section.label}</h2>
            </header>
            {section.note && <p className="text-sm text-muted">{section.note}</p>}

            {showScale && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3.5 py-2.5 text-xs text-muted">
                {labels.map((l) => (
                  <span key={l.value}>
                    <b className="text-ink">{l.value}</b> {l.label}
                  </span>
                ))}
              </div>
            )}

            {section.code === "interview" && <InterviewNotice />}

            <div className="mt-1 divide-y divide-line">
              {questions.map((question) =>
                question.type === "text" ? (
                  <TextRow
                    key={question.code}
                    question={question}
                    value={texts[question.code] ?? ""}
                    invalid={touched && question.required && !(texts[question.code] ?? "").trim()}
                    onChange={(v) => setTexts((prev) => ({ ...prev, [question.code]: v }))}
                  />
                ) : (
                  <OptionRow
                    key={question.code}
                    question={question}
                    labels={labels}
                    value={choices[question.code]}
                    invalid={touched && !choices[question.code]}
                    onChange={(v) => setChoices((prev) => ({ ...prev, [question.code]: v }))}
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
                  {periodLabel} · 선택형 문항 {answered}/{ANSWERABLE_REQUIRED.length}
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
            <button type="submit" className="btn-primary shrink-0" disabled={submitting}>
              {submitting ? "제출 중…" : "설문 제출하기"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-red-600">{children}</p>;
}

function Chip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${
        active
          ? "border-brand bg-brand font-semibold text-white"
          : "border-line bg-white hover:border-brand/40 hover:bg-brandSoft"
      }`}
    >
      <input type="radio" className="sr-only" checked={active} onChange={onSelect} />
      {label}
    </label>
  );
}

function InterviewNotice() {
  return (
    <div className="mt-4 space-y-2.5">
      <p className="rounded-lg bg-brandSoft px-3.5 py-3 text-sm leading-relaxed">
        <b>🤝 1:1 면담이 진행됩니다. 가능한 일시를 적어주세요.</b>
        <br />
        이번 설문 내용이나 별도의 고민에 대해 회사와 직접 이야기하는 자리입니다.
      </p>
      <p className="rounded-lg bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-muted">
        🔒 면담 사실과 내용은 비밀이 보장되며, 면담으로 인한 불이익은 일절 없습니다. 위에서
        「대표이사만 열람」을 선택하신 경우 면담도 대표이사와 진행됩니다.
      </p>
    </div>
  );
}

function OptionRow({
  question,
  labels,
  value,
  invalid,
  onChange,
}: {
  question: Question;
  labels: { value: number; label: string }[];
  value: number | undefined;
  invalid: boolean;
  onChange: (value: number) => void;
}) {
  const isScale = question.type === "scale5";
  const options = isScale
    ? labels.map((l) => ({ value: l.value, label: "" }))
    : (question.options ?? []);
  const number = QUESTION_NUMBER.get(question.code);

  return (
    <div
      id={`q-${question.code}`}
      className={`scroll-mt-24 py-4 ${invalid ? "-mx-3 rounded-lg bg-red-50/60 px-3" : ""}`}
    >
      <p className="text-sm font-medium leading-relaxed">
        {number && <span className="mr-1.5 tabular-nums text-muted">{number}.</span>}
        {question.prompt}
        {invalid && <span className="ml-1.5 text-xs font-bold text-red-600">미응답</span>}
      </p>
      <div
        className={`mt-3 grid gap-1.5 ${
          isScale ? "grid-cols-5" : options.length >= 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-3"
        }`}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-1.5 py-2.5 text-center transition ${
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
              {isScale ? (
                <span className="block text-sm font-bold tabular-nums">{option.value}</span>
              ) : (
                <span className="block text-[13px] font-medium leading-tight">{option.label}</span>
              )}
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
  invalid,
  onChange,
}: {
  question: Question;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const MAX = 2000;
  const single = question.sectionCode === "interview";
  const number = QUESTION_NUMBER.get(question.code);

  return (
    <div id={`q-${question.code}`} className="scroll-mt-24 py-4">
      <label className="block text-sm font-medium leading-relaxed" htmlFor={`input-${question.code}`}>
        {number && <span className="mr-1.5 tabular-nums text-muted">{number}.</span>}
        {question.prompt}
        {question.required ? (
          <span className="ml-1 text-red-600">*</span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-muted">(선택)</span>
        )}
      </label>
      {single ? (
        <input
          id={`input-${question.code}`}
          className={`field mt-2 ${invalid ? "border-red-400" : ""}`}
          value={value}
          maxLength={200}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
        />
      ) : (
        <>
          <textarea
            id={`input-${question.code}`}
            className="field mt-2.5 min-h-[104px] resize-y leading-relaxed"
            value={value}
            maxLength={MAX}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-muted">
            {value.length}/{MAX}
          </p>
        </>
      )}
      {invalid && <FieldError>이 항목을 입력해 주세요.</FieldError>}
    </div>
  );
}
