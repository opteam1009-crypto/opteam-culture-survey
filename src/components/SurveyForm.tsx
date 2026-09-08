"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ANSWERABLE_REQUIRED,
  INTERVIEW_TIME_SLOTS,
  QUESTION_NUMBER,
  SECTIONS,
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
  const [visibility, setVisibility] = useState("both");
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const requiredTexts = useMemo(
    () =>
      SECTIONS.flatMap((s) => questionsOfSection(s.code)).filter(
        (q) => q.type === "text" && q.required,
      ),
    [],
  );

  const answered = ANSWERABLE_REQUIRED.filter((q) => choices[q.code]).length;
  const progress = Math.round((answered / ANSWERABLE_REQUIRED.length) * 100);

  const missingProfile = !name.trim() || !departmentId;
  const firstUnanswered = ANSWERABLE_REQUIRED.find((q) => !choices[q.code]);
  const firstEmptyText = requiredTexts.find((q) => !(texts[q.code] ?? "").trim());

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    setError(null);

    if (missingProfile) {
      setError("성명과 소속 부서를 입력해 주세요.");
      scrollTo("profile-section");
      return;
    }
    if (firstUnanswered) {
      setError("아직 답하지 않은 문항이 있습니다. 표시된 곳을 확인해 주세요.");
      scrollTo(`q-${firstUnanswered.code}`);
      return;
    }
    if (firstEmptyText) {
      setError("1:1 면담 희망 일시의 날짜와 시간을 모두 선택해 주세요.");
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
    <>
      {/* 화면 맨 위에 얇게 붙는 진행 표시.
          pointer-events-none 이 없으면 이 투명한 띠가 화면 최상단의 클릭을 가로챕니다. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 h-1 bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-accent to-brand transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} className="pb-32">
        {/* ── 응답자 정보 ──────────────────────────────────── */}
        <section id="profile-section" className="card mb-4 scroll-mt-6 overflow-hidden">
          <div className="border-b border-line bg-brandTint px-6 py-4">
            <h2 className="text-[15px] font-bold leading-7">응답자 정보</h2>
            <p className="mt-1 text-sm text-ink/70">
              집계와 후속 면담을 위해 실명으로 받습니다.
            </p>
          </div>

          <div className="p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">
                  성명 <Required />
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
                  소속 부서 <Required />
                </label>
                <select
                  id="department"
                  className="field appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3E%3Cpath d='M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06z'/%3E%3C/svg%3E\")",
                  }}
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
                {touched && !departmentId && <FieldError>소속 부서를 선택해 주세요.</FieldError>}
              </div>
            </div>

            <div className="mt-7">
              <span className="label">이 응답의 열람 범위를 선택해 주세요</span>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const active = visibility === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`group relative cursor-pointer rounded-xl border px-4 py-3.5 transition ${
                        active
                          ? "border-brand bg-brandSoft ring-4 ring-brand/10"
                          : "border-line bg-white hover:border-brand/35 hover:bg-brandTint"
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
                      <span className="flex items-center gap-1.5">
                        {option.lock && <span aria-hidden>🔒</span>}
                        <span
                          className={`text-sm font-bold ${active ? "text-brand" : "text-ink"}`}
                        >
                          {option.title}
                        </span>
                        {active && <CheckDot />}
                      </span>
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-ink/70">
                        {option.hint}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3.5 text-[14px] leading-[1.75] text-ink/75">
                인사책임자를 거치지 않고 대표이사에게 직접 전달하고 싶다면{" "}
                <b className="text-ink">「대표이사만 열람」</b>을, 반대로 대표이사에게는 알리지 않고
                인사책임자와만 이야기하고 싶다면 <b className="text-ink">「인사책임자만 열람」</b>을
                선택해 주세요. 선택하신 범위 밖의 사람에게는 이 응답이 표시되지 않습니다.
              </p>
            </div>
          </div>
        </section>

        {/* ── 문항 ─────────────────────────────────────────── */}
        {SECTIONS.map((section) => {
          const questions = questionsOfSection(section.code);
          if (questions.length === 0) return null;

          const options = questions.filter((q) => q.type === "scale5" || q.type === "choice");
          const dateQuestions = questions.filter((q) => q.type === "datetime" && q.required);
          const done =
            options.filter((q) => choices[q.code]).length +
            dateQuestions.filter((q) => (texts[q.code] ?? "").trim()).length;
          const total = options.length + dateQuestions.length;
          const complete = total > 0 && done === total;
          const showScale = questions.some((q) => q.type === "scale5");
          const labels = scaleLabelsFor(section.code);

          return (
            <section key={section.code} className="card mb-4 overflow-hidden">
              <header
                className={`flex items-start gap-3.5 border-b border-line px-6 py-4 transition-colors ${
                  complete ? "bg-emerald-50/60" : "bg-brandTint"
                }`}
              >
                {/* 배지 높이(28px)와 제목의 첫 줄 높이를 맞춰야 위아래로 뜨지 않습니다. */}
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                    complete ? "bg-emerald-600 text-white" : "bg-brand text-white"
                  }`}
                >
                  {complete ? "✓" : section.index}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-bold leading-7">{section.label}</h2>
                  {section.note && (
                    <p className="mt-0.5 text-sm leading-relaxed text-ink/70">{section.note}</p>
                  )}
                </div>
                {total > 0 && (
                  <span
                    className={`flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-bold tabular-nums ${
                      complete ? "bg-emerald-100 text-emerald-800" : "bg-white text-muted"
                    }`}
                  >
                    {done}/{total}
                  </span>
                )}
              </header>

              <div className="px-6 pb-5 pt-1">
                {showScale && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 rounded-xl bg-gray-50 px-4 py-3 text-[13px] text-ink/75">
                    {labels.map((l) => (
                      <span key={l.value}>
                        <b className="text-ink">{l.value}</b> {l.label}
                      </span>
                    ))}
                  </div>
                )}

                {section.code === "interview" && <InterviewNotice />}

                <div className="q-divider">
                  {questions.map((question, questionIndex) =>
                    question.type === "datetime" ? (
                      <DateTimeRow
                        key={question.code}
                        question={question}
                        value={texts[question.code] ?? ""}
                        invalid={touched && question.required && !(texts[question.code] ?? "").trim()}
                        onChange={(v) => setTexts((prev) => ({ ...prev, [question.code]: v }))}
                      />
                    ) : question.type === "text" ? (
                      <TextRow
                        key={question.code}
                        question={question}
                        value={texts[question.code] ?? ""}
                        invalid={
                          touched && question.required && !(texts[question.code] ?? "").trim()
                        }
                        onChange={(v) => setTexts((prev) => ({ ...prev, [question.code]: v }))}
                      />
                    ) : question.type === "scale5" ? (
                      <ScaleRow
                        key={question.code}
                        question={question}
                        labels={labels}
                        value={choices[question.code]}
                        invalid={touched && !choices[question.code]}
                        // 양 끝 문구는 섹션의 첫 척도 문항에만 둡니다.
                        // 매 문항마다 반복하면 상단 범례와 겹쳐 화면이 산만해집니다.
                        showAnchors={
                          questions.findIndex((q) => q.type === "scale5") === questionIndex
                        }
                        onChange={(v) => setChoices((prev) => ({ ...prev, [question.code]: v }))}
                      />
                    ) : (
                      <ChoiceRow
                        key={question.code}
                        question={question}
                        value={choices[question.code]}
                        invalid={touched && !choices[question.code]}
                        onChange={(v) => setChoices((prev) => ({ ...prev, [question.code]: v }))}
                      />
                    ),
                  )}
                </div>
              </div>
            </section>
          );
        })}

        {/* ── 하단 고정 제출 바 ────────────────────────────── */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/92 backdrop-blur-md">
          <div className="mx-auto max-w-3xl px-5 py-3.5">
            {error && (
              <p className="mb-2.5 flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                <span aria-hidden>⚠</span>
                <span>{error}</span>
              </p>
            )}
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-muted">
                    {periodLabel} · 필수 문항{" "}
                    <b className="text-ink tabular-nums">
                      {answered}/{ANSWERABLE_REQUIRED.length}
                    </b>
                  </span>
                  <span className="font-bold tabular-nums text-brand">{progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-brand transition-[width] duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary shrink-0 px-5" disabled={submitting}>
                {submitting ? "제출 중…" : "설문 제출하기"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function Required() {
  return <span className="text-red-500">*</span>;
}

function CheckDot() {
  return (
    <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
      ✓
    </span>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs font-medium text-red-600">{children}</p>;
}

function QuestionHead({
  question,
  invalid,
  selected,
}: {
  question: Question;
  invalid: boolean;
  selected?: string;
}) {
  const number = QUESTION_NUMBER.get(question.code);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p className="text-[15px] font-medium leading-relaxed text-ink">
        {number && <span className="mr-1.5 tabular-nums text-muted">{number}.</span>}
        {question.prompt}
      </p>
      {selected && (
        <span className="rounded-full bg-brandSoft px-2 py-0.5 text-xs font-bold text-brand">
          {selected}
        </span>
      )}
      {invalid && (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
          미응답
        </span>
      )}
    </div>
  );
}

function ScaleRow({
  question,
  labels,
  value,
  invalid,
  showAnchors,
  onChange,
}: {
  question: Question;
  labels: { value: number; label: string }[];
  value: number | undefined;
  invalid: boolean;
  showAnchors: boolean;
  onChange: (value: number) => void;
}) {
  const selectedLabel = labels.find((l) => l.value === value)?.label;

  return (
    <div
      id={`q-${question.code}`}
      className={`scroll-mt-24 py-5 ${invalid ? "-mx-3 rounded-xl bg-red-50/70 px-3" : ""}`}
    >
      <QuestionHead question={question} invalid={invalid} selected={selectedLabel} />

      <div className="mt-3.5 grid grid-cols-5 gap-2">
        {labels.map((option) => {
          const active = value === option.value;
          return (
            <label
              key={option.value}
              title={option.label}
              className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border text-base font-bold tabular-nums transition ${
                active
                  ? "animate-pop border-brand bg-brand text-white shadow-sm"
                  : "border-line bg-white text-gray-600 hover:border-brand/45 hover:bg-brandTint hover:text-brand"
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
              {option.value}
            </label>
          );
        })}
      </div>
      {showAnchors && (
        <div className="mt-2 flex justify-between text-[13px] font-medium text-ink/70">
          <span>{labels[0]?.label}</span>
          <span>{labels[labels.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}

function ChoiceRow({
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
  const options = question.options ?? [];
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div
      id={`q-${question.code}`}
      className={`scroll-mt-24 py-5 ${invalid ? "-mx-3 rounded-xl bg-red-50/70 px-3" : ""}`}
    >
      <QuestionHead question={question} invalid={invalid} selected={selectedLabel} />

      {/* 보기 문구가 길어 한 줄씩 놓습니다. 좁은 화면에서도 읽힙니다. */}
      <div className="mt-3.5 space-y-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                active
                  ? "border-brand bg-brandSoft"
                  : "border-line bg-white hover:border-brand/35 hover:bg-brandTint"
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
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  active ? "border-brand bg-brand" : "border-gray-300 bg-white"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span
                className={`text-[15px] leading-snug ${active ? "font-semibold text-brand" : "text-ink"}`}
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
    <div id={`q-${question.code}`} className="scroll-mt-24 py-5">
      <label
        className="block text-[15px] font-medium leading-relaxed text-ink"
        htmlFor={`input-${question.code}`}
      >
        {number && <span className="mr-1.5 tabular-nums text-muted">{number}.</span>}
        {question.prompt}
        {question.required ? (
          <Required />
        ) : (
          <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-normal text-muted">
            선택
          </span>
        )}
      </label>

      {single ? (
        <input
          id={`input-${question.code}`}
          className={`field mt-2.5 ${invalid ? "border-red-400 ring-4 ring-red-100" : ""}`}
          value={value}
          maxLength={200}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
        />
      ) : (
        <>
          <textarea
            id={`input-${question.code}`}
            className="field mt-2.5 min-h-[112px] resize-y leading-relaxed"
            value={value}
            maxLength={MAX}
            onChange={(e) => onChange(e.target.value)}
            placeholder={question.placeholder}
          />
          {value.length > 0 && (
            <p className="mt-1 text-right text-[11px] tabular-nums text-muted">
              {value.length}/{MAX}
            </p>
          )}
        </>
      )}
      {invalid && <FieldError>이 항목을 입력해 주세요.</FieldError>}
    </div>
  );
}

function InterviewNotice() {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="rounded-xl border border-brand/15 bg-brandSoft px-4 py-3.5">
        <p className="text-sm font-bold text-brand">
          <span aria-hidden className="mr-1">🤝</span>
          1:1 면담이 진행됩니다. 가능한 일시를 선택해 주세요.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/75">
          이번 설문 내용이나 별도의 고민에 대해 회사와 직접 이야기하는 자리입니다.
        1순위와 2순위를 모두 골라주시면 일정을 잡기 수월합니다.
        </p>
      </div>
      <p className="rounded-xl bg-gray-50 px-4 py-3.5 text-[14px] leading-[1.75] text-ink/75">
        <span aria-hidden className="mr-1">🔒</span>
        면담 사실과 내용은 비밀이 보장되며, 면담으로 인한 불이익은 일절 없습니다. 위에서
        「대표이사만 열람」 또는 「인사책임자만 열람」을 선택하신 경우 면담도 해당 열람자와만
        진행됩니다.
      </p>
    </div>
  );
}

/**
 * 면담 희망 일시. 예전에는 자유 입력이라 "화요일 오후" 처럼 날짜를 특정할 수 없는
 * 답이 많았고, 그러면 캘린더에 놓을 수가 없습니다. 날짜는 달력으로, 시간은 30분
 * 단위로 받아 'YYYY-MM-DD HH:MM' 로 저장합니다.
 */
function DateTimeRow({
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
  // 날짜와 시간을 각각 들고 있어야 합니다. 합쳐진 값 하나만 부모에 두면
  // 날짜만 고른 순간 아직 미완성이라 빈 값이 되돌아와 입력이 지워집니다.
  const [date, setDate] = useState(() => value.split(" ")[0] ?? "");
  const [time, setTime] = useState(() => value.split(" ")[1] ?? "");

  // 오늘부터 90일까지만 고를 수 있게 합니다.
  const today = new Date();
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const min = toKey(today);
  const max = toKey(new Date(today.getTime() + 90 * 86400000));

  const weekday = date
    ? ["일", "월", "화", "수", "목", "금", "토"][new Date(`${date}T00:00:00`).getDay()]
    : null;

  function update(nextDate: string, nextTime: string) {
    setDate(nextDate);
    setTime(nextTime);
    // 부모(제출 값)에는 둘 다 채워졌을 때만 완성된 값을 올립니다.
    onChange(nextDate && nextTime ? `${nextDate} ${nextTime}` : "");
  }

  return (
    <div id={`q-${question.code}`} className="scroll-mt-24 py-5">
      <span className="block text-[15px] font-medium leading-relaxed text-ink">
        {question.prompt}
        <Required />
      </span>

      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[13px] font-semibold text-ink/70" htmlFor={`date-${question.code}`}>
            날짜
          </label>
          <input
            id={`date-${question.code}`}
            type="date"
            className={`field ${invalid && !date ? "border-red-400 ring-4 ring-red-100" : ""}`}
            value={date}
            min={min}
            max={max}
            onChange={(e) => update(e.target.value, time)}
          />
          {weekday && (
            <p className="mt-1 text-[13px] text-ink/60">
              {weekday}요일
              {weekday === "토" || weekday === "일" ? " · 주말입니다" : ""}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-ink/70" htmlFor={`time-${question.code}`}>
            시간
          </label>
          <select
            id={`time-${question.code}`}
            className={`field appearance-none bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat pr-10 ${
              invalid && !time ? "border-red-400 ring-4 ring-red-100" : ""
            }`}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3E%3Cpath d='M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06z'/%3E%3C/svg%3E\")",
            }}
            value={time}
            onChange={(e) => update(date, e.target.value)}
          >
            <option value="">시간을 선택해 주세요</option>
            {INTERVIEW_TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {invalid && <FieldError>날짜와 시간을 모두 선택해 주세요.</FieldError>}
    </div>
  );
}
