/**
 * 제출된 응답을 설문 화면과 같은 모습으로 보여줍니다.
 * 응답자가 실제로 본 폼 위에 고른 보기가 그대로 칠해져 있어야
 * "이 사람이 무엇을 보고 무엇을 골랐는지" 를 그대로 읽을 수 있습니다.
 * 읽기 전용이라 입력 요소 없이 같은 모양만 그립니다.
 */
import {
  QUESTION_NUMBER,
  SECTIONS,
  type Question,
  questionsOfSection,
  scaleLabelsFor,
} from "@/lib/questions";
import { WEEKDAY_LABELS } from "@/lib/schedule";

export interface SheetAnswer {
  value_num: number | null;
  value_text: string | null;
}

type Answers = Map<string, SheetAnswer>;

export default function ResponseSheet({ answers }: { answers: Answers }) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => {
        const questions = questionsOfSection(section.code);
        if (questions.length === 0) return null;

        const pickable = questions.filter((q) => q.type === "scale5" || q.type === "choice");
        const picked = pickable.filter((q) => answers.get(q.code)?.value_num != null).length;
        const showScale = questions.some((q) => q.type === "scale5");
        const labels = scaleLabelsFor(section.code);
        const firstScaleIndex = questions.findIndex((q) => q.type === "scale5");

        return (
          <section key={section.code} className="card overflow-hidden">
            <header className="flex items-start gap-3.5 border-b border-line bg-brandTint px-6 py-4">
              {/* 배지 높이(28px)와 제목의 첫 줄 높이를 맞춰야 위아래로 뜨지 않습니다. */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold tabular-nums text-white">
                {section.index}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold leading-7">{section.label}</h2>
                {section.note && (
                  <p className="mt-0.5 text-sm leading-relaxed text-ink/70">{section.note}</p>
                )}
              </div>
              {pickable.length > 0 && (
                <span className="flex h-7 shrink-0 items-center rounded-full bg-white px-2.5 text-xs font-bold tabular-nums text-muted">
                  {picked}/{pickable.length}
                </span>
              )}
            </header>

            <div className="px-6 pb-5 pt-1">
              {showScale && (
                <div className="mt-4 flex flex-wrap gap-2 rounded-xl border border-line bg-gray-50/80 px-4 py-3">
                  {labels.map((l) => (
                    <span
                      key={l.value}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[14px] font-medium text-ink shadow-sm"
                    >
                      <b className="flex h-5 w-5 items-center justify-center rounded-md bg-brand text-[12px] font-bold text-white">
                        {l.value}
                      </b>
                      {l.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="q-divider">
                {questions.map((question, index) => {
                  const answer = answers.get(question.code);
                  if (question.type === "scale5") {
                    return (
                      <ScaleAnswer
                        key={question.code}
                        question={question}
                        labels={labels}
                        value={answer?.value_num ?? null}
                        showAnchors={index === firstScaleIndex}
                      />
                    );
                  }
                  if (question.type === "choice") {
                    return (
                      <ChoiceAnswer
                        key={question.code}
                        question={question}
                        value={answer?.value_num ?? null}
                      />
                    );
                  }
                  return (
                    <TextAnswer
                      key={question.code}
                      question={question}
                      value={answer?.value_text ?? ""}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function QuestionHead({
  question,
  selected,
}: {
  question: Question;
  selected: string | null;
}) {
  const number = QUESTION_NUMBER.get(question.code);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p className="text-[15px] font-medium leading-relaxed text-ink">
        {number && <span className="mr-1.5 tabular-nums text-muted">{number}.</span>}
        {question.prompt}
      </p>
      {selected ? (
        <span className="rounded-full bg-brandSoft px-2 py-0.5 text-xs font-bold text-brand">
          {selected}
        </span>
      ) : (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-muted">
          무응답
        </span>
      )}
    </div>
  );
}

function ScaleAnswer({
  question,
  labels,
  value,
  showAnchors,
}: {
  question: Question;
  labels: { value: number; label: string }[];
  value: number | null;
  showAnchors: boolean;
}) {
  const selected = labels.find((l) => l.value === value)?.label ?? null;

  return (
    <div className="py-5">
      <QuestionHead question={question} selected={selected} />

      <div className="mt-3.5 grid grid-cols-5 gap-2">
        {labels.map((option) => {
          const active = value === option.value;
          return (
            <div
              key={option.value}
              title={option.label}
              aria-label={`${option.value}점 ${option.label}${active ? " (선택)" : ""}`}
              className={`flex h-12 items-center justify-center rounded-xl border text-base font-bold tabular-nums ${
                active
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-line bg-white text-gray-300"
              }`}
            >
              {option.value}
            </div>
          );
        })}
      </div>
      {showAnchors && (
        <div className="mt-2 flex justify-between text-[14px] font-medium text-ink/75">
          <span>{labels[0]?.label}</span>
          <span>{labels[labels.length - 1]?.label}</span>
        </div>
      )}
    </div>
  );
}

function ChoiceAnswer({ question, value }: { question: Question; value: number | null }) {
  const options = question.options ?? [];
  const selected = options.find((o) => o.value === value)?.label ?? null;

  return (
    <div className="py-5">
      <QuestionHead question={question} selected={selected} />

      <div className="mt-3.5 space-y-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <div
              key={option.value}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                active ? "border-brand bg-brandSoft" : "border-line bg-white"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? "border-brand bg-brand" : "border-gray-200 bg-white"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span
                className={`text-[15px] leading-snug ${
                  active ? "font-semibold text-brand" : "text-gray-400"
                }`}
              >
                {option.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TextAnswer({ question, value }: { question: Question; value: string }) {
  const number = QUESTION_NUMBER.get(question.code);
  const text = value.trim();
  const display = question.type === "datetime" ? formatSlot(text) : text;

  return (
    <div className="py-5">
      <p className="text-[15px] font-medium leading-relaxed text-ink">
        {number && <span className="mr-1.5 tabular-nums text-muted">{number}.</span>}
        {question.prompt}
        {!question.required && (
          <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-normal text-muted">
            선택
          </span>
        )}
      </p>
      {display ? (
        <p className="mt-2.5 whitespace-pre-wrap rounded-xl border border-line bg-gray-50 px-4 py-3.5 text-[15px] leading-[1.75] text-ink">
          {display}
        </p>
      ) : (
        <p className="mt-2.5 rounded-xl border border-dashed border-line bg-white px-4 py-3.5 text-[15px] text-gray-400">
          작성하지 않음
        </p>
      )}
    </div>
  );
}

/**
 * 면담 희망 일시는 'YYYY-MM-DD HH:MM' 으로 저장됩니다.
 * 그 형식이 아니면(달력 도입 전의 자유 입력) 적어주신 그대로 보여줍니다.
 */
function formatSlot(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!m) return value;
  const [, y, mo, d, hh, mm] = m;
  const weekday = WEEKDAY_LABELS[new Date(`${y}-${mo}-${d}T00:00:00Z`).getUTCDay()];
  const hour = Number(hh);
  const half = hour < 12 ? "오전" : "오후";
  const display = hour <= 12 ? hour : hour - 12;
  return `${Number(y)}년 ${Number(mo)}월 ${Number(d)}일 (${weekday}) ${half} ${display}:${mm}`;
}
