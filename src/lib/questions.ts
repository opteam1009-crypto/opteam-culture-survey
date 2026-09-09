// 월간 조직 컨디션 설문 정의.
// 이 파일이 문항의 원본(source of truth)이며, 서버 기동 시 DB로 동기화됩니다.
// 문항을 바꿀 때 code 를 유지하면 과거 회차와 추이 비교가 이어집니다.
// 문구만 고치는 것은 안전하고, 의미가 달라지면 새 code 를 부여하세요.

export type QuestionType = "scale5" | "choice" | "text" | "datetime";

export interface ChoiceOption {
  value: number;
  label: string;
}

/** 리스크 문항의 응답값별 심각도. 0=이상 없음, 1=주의, 2=경고 */
export type Severity = 0 | 1 | 2;

export interface Question {
  code: string;
  sectionCode: string;
  type: QuestionType;
  prompt: string;
  /** 주관식 입력란 안내 문구 */
  placeholder?: string;
  /** 선택형 문항의 보기 */
  options?: ChoiceOption[];
  /** 0~100점 환산에 포함되는 문항인지 */
  scored: boolean;
  required: boolean;
  /** 리스크 지표로 별도 집계할 문항 */
  risk?: {
    /** 대시보드에 쓰는 짧은 이름 */
    label: string;
    severity: Record<number, Severity>;
  };
}

export interface Section {
  code: string;
  index: string;
  label: string;
  note?: string;
  /** 이 섹션의 척도 보기 문구. 지정하지 않으면 기본 척도를 씁니다. */
  scaleLabels?: { value: number; label: string }[];
}

export const DEFAULT_SCALE_LABELS = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "그렇지 않다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

const RETENTION_SCALE_LABELS = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "그렇지 않다" },
  { value: 3, label: "잘 모르겠다" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

export const SECTIONS: Section[] = [
  { code: "cond", index: "01", label: "업무 컨디션", note: "지난 한 달을 기준으로 답해주세요" },
  { code: "lead", index: "02", label: "리더십 및 소통" },
  { code: "growth", index: "03", label: "성장 및 회사 신뢰" },
  { code: "org", index: "04", label: "조직 컨디션" },
  {
    code: "retention",
    index: "05",
    label: "향후 근무 의향",
    scaleLabels: RETENTION_SCALE_LABELS,
  },
  { code: "risk", index: "06", label: "조직 리스크 체크" },
  { code: "voice", index: "07", label: "자유 의견", note: "사소한 내용도 좋습니다" },
  { code: "ceo", index: "08", label: "대표에게 하고 싶은 말", note: "작성하지 않아도 됩니다" },
  { code: "interview", index: "09", label: "1:1 면담 일정", note: "전 직원 필수" },
];

/** 점수로 환산하는 영역. 리스크·자유의견·면담은 점수에 들어가지 않습니다. */
export const SCORED_SECTION_CODES = ["cond", "lead", "growth", "org", "retention"];

const YES_NO_3 = (middle: string, high: string): ChoiceOption[] => [
  { value: 1, label: "없다" },
  { value: 2, label: middle },
  { value: 3, label: high },
];

const RISK_3: Record<number, Severity> = { 1: 0, 2: 1, 3: 2 };

export const QUESTIONS: Question[] = [
  // ── 01 업무 컨디션 ────────────────────────────────────────
  { code: "cond_1", sectionCode: "cond", type: "scale5", scored: true, required: true,
    prompt: "지난 달 업무량은 감당 가능한 수준이었다." },
  { code: "cond_2", sectionCode: "cond", type: "scale5", scored: true, required: true,
    prompt: "내가 해야 할 업무의 우선순위와 목표가 명확했다." },
  { code: "cond_3", sectionCode: "cond", type: "scale5", scored: true, required: true,
    prompt: "불필요한 보고·회의·반복 업무 때문에 시간을 낭비하지 않았다." },
  { code: "cond_4", sectionCode: "cond", type: "scale5", scored: true, required: true,
    prompt: "지난 달 업무를 통해 성취감이나 보람을 느꼈다." },

  // ── 02 리더십 및 소통 ─────────────────────────────────────
  { code: "lead_1", sectionCode: "lead", type: "scale5", scored: true, required: true,
    prompt: "회사 또는 직속 상사(팀장·리더)는 업무의 우선순위와 기대 수준을 명확하게 전달한다." },
  { code: "lead_2", sectionCode: "lead", type: "scale5", scored: true, required: true,
    prompt: "업무에 필요한 정보가 적절한 시점에 공유된다." },
  { code: "lead_3", sectionCode: "lead", type: "scale5", scored: true, required: true,
    prompt: "업무상 문제나 반대 의견을 부담 없이 이야기할 수 있다." },
  { code: "lead_4", sectionCode: "lead", type: "scale5", scored: true, required: true,
    prompt: "업무 배분과 의사결정이 합리적이고 공정하다고 느낀다." },

  // ── 03 성장 및 회사 신뢰 ──────────────────────────────────
  { code: "growth_1", sectionCode: "growth", type: "scale5", scored: true, required: true,
    prompt: "나는 이 회사에서 업무적으로 성장하고 있다고 느낀다." },
  { code: "growth_2", sectionCode: "growth", type: "scale5", scored: true, required: true,
    prompt: "회사가 현재 어떤 방향으로 가고 있는지 이해하고 있다." },
  { code: "growth_3", sectionCode: "growth", type: "scale5", scored: true, required: true,
    prompt: "회사의 중요한 의사결정과 경영 방향을 신뢰한다." },

  // ── 04 조직 컨디션 ────────────────────────────────────────
  { code: "org_1", sectionCode: "org", type: "scale5", scored: true, required: true,
    prompt: "지난 달 스트레스와 피로는 감당할 수 있는 수준이었다." },
  { code: "org_2", sectionCode: "org", type: "scale5", scored: true, required: true,
    prompt: "회사에서 존중받으며 일하고 있다고 느낀다." },
  { code: "org_3", sectionCode: "org", type: "scale5", scored: true, required: true,
    prompt: "전반적으로 지난 달 회사생활에 만족한다." },

  // ── 05 향후 근무 의향 ─────────────────────────────────────
  { code: "retention_1", sectionCode: "retention", type: "scale5", scored: true, required: true,
    prompt: "6개월 후에도 이 회사에서 계속 일하고 싶다." },
  {
    code: "retention_2",
    sectionCode: "retention",
    type: "choice",
    scored: false,
    required: true,
    prompt: "지난 한 달 동안 이직이나 퇴사를 진지하게 생각한 적이 있습니까?",
    options: [
      { value: 1, label: "전혀 없다" },
      { value: 2, label: "한두 번 생각했다" },
      { value: 3, label: "가끔 생각했다" },
      { value: 4, label: "자주 생각했다" },
      { value: 5, label: "실제로 알아보고 있다" },
    ],
    // 이직 검토는 만족도 평균에 섞으면 묻힙니다. 별도 이탈 신호로 셉니다.
    risk: { label: "이직 검토", severity: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 } },
  },

  // ── 06 조직 리스크 체크 ───────────────────────────────────
  {
    code: "risk_1", sectionCode: "risk", type: "choice", scored: false, required: true,
    prompt: "지난 한 달 동안 업무 또는 인간관계 때문에 혼자 감당하기 어렵다고 느낀 적이 있습니까?",
    options: YES_NO_3("약간 있다", "자주 있다"),
    risk: { label: "번아웃 신호", severity: RISK_3 },
  },
  {
    code: "risk_2", sectionCode: "risk", type: "choice", scored: false, required: true,
    prompt: "지난 한 달 동안 부당하다고 느낀 지시·대우·업무 요구를 받은 적이 있습니까?",
    options: YES_NO_3("약간 있다", "있다"),
    risk: { label: "부당 대우", severity: RISK_3 },
  },
  {
    code: "risk_3", sectionCode: "risk", type: "choice", scored: false, required: true,
    prompt: "회사나 상사에게 말하지 못하고 있는 업무상 고민이나 불편사항이 있습니까?",
    options: YES_NO_3("조금 있다", "있다"),
    risk: { label: "말 못한 고민", severity: RISK_3 },
  },

  // ── 07 자유 의견 ──────────────────────────────────────────
  { code: "voice_keep", sectionCode: "voice", type: "text", scored: false, required: false,
    prompt: "지난 달 회사에서 계속 유지했으면 하는 것 한 가지가 있다면 무엇인가요?",
    placeholder: "자유롭게 작성해주세요." },
  { code: "voice_improve", sectionCode: "voice", type: "text", scored: false, required: false,
    prompt: "회사가 앞으로 딱 한 가지만 개선한다면 가장 먼저 바꿨으면 하는 것은 무엇인가요?",
    placeholder: "업무방식, 조직문화, 시스템, 소통, 복지, 근무환경 등 무엇이든 좋습니다." },
  { code: "voice_idea", sectionCode: "voice", type: "text", scored: false, required: false,
    prompt: "회사의 매출·업무효율·고객만족을 높일 수 있는 아이디어가 있다면 적어주세요.",
    placeholder: "사소한 아이디어도 좋습니다." },

  // ── 08 대표에게 하고 싶은 말 ──────────────────────────────
  { code: "ceo_message", sectionCode: "ceo", type: "text", scored: false, required: false,
    prompt: "대표 또는 경영진에게 전달하고 싶은 이야기가 있다면 자유롭게 적어주세요.",
    placeholder: "이 항목은 선택사항입니다." },

  // ── 09 1:1 면담 일정 ──────────────────────────────────────
  { code: "interview_first", sectionCode: "interview", type: "datetime", scored: false, required: true,
    prompt: "1순위 일시" },
  { code: "interview_second", sectionCode: "interview", type: "datetime", scored: false, required: true,
    prompt: "2순위 일시" },
  { code: "interview_topic", sectionCode: "interview", type: "text", scored: false, required: false,
    prompt: "면담 주제", placeholder: "간단히 적어주세요 (선택)" },
];

export const VISIBILITY_OPTIONS = [
  {
    value: "both",
    title: "대표이사 + 인사책임자",
    hint: "두 분 모두 이 응답을 열람합니다.",
    lock: false,
  },
  {
    value: "ceo_only",
    title: "대표이사만 열람",
    hint: "인사책임자는 이 응답을 볼 수 없습니다.",
    lock: true,
  },
  {
    value: "hr_only",
    title: "인사책임자만 열람",
    hint: "대표이사는 이 응답을 볼 수 없습니다.",
    lock: true,
  },
];

export const SCORED_QUESTIONS = QUESTIONS.filter((q) => q.scored);
export const CHOICE_QUESTIONS = QUESTIONS.filter((q) => q.type === "choice");
export const TEXT_QUESTIONS = QUESTIONS.filter(
  (q) => q.type === "text" || q.type === "datetime",
);
export const DATETIME_QUESTIONS = QUESTIONS.filter((q) => q.type === "datetime");

/** 면담 가능 시간대. 30분 단위로 09:00~19:00 를 제공합니다. */
export const INTERVIEW_TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let minutes = 9 * 60; minutes <= 19 * 60; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const period = h < 12 ? "오전" : "오후";
    const displayHour = h <= 12 ? h : h - 12;
    slots.push({ value, label: `${period} ${displayHour}:${String(m).padStart(2, "0")}` });
  }
  return slots;
})();

const TIME_SLOT_VALUES = new Set(INTERVIEW_TIME_SLOTS.map((s) => s.value));

/** 'YYYY-MM-DD HH:MM' 형식인지, 그리고 허용된 시간대인지 확인합니다. */
export function isValidInterviewSlot(value: string): boolean {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/);
  if (!m) return false;
  if (!TIME_SLOT_VALUES.has(m[4])) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}
export const RISK_QUESTIONS = QUESTIONS.filter((q) => q.risk);
export const REQUIRED_QUESTIONS = QUESTIONS.filter((q) => q.required);
/** 척도·선택형 등 보기를 고르는 필수 문항 (진행률 계산 기준) */
export const ANSWERABLE_REQUIRED = QUESTIONS.filter(
  (q) => q.required && (q.type === "scale5" || q.type === "choice"),
);

export const QUESTION_BY_CODE = new Map(QUESTIONS.map((q) => [q.code, q]));
export const SECTION_BY_CODE = new Map(SECTIONS.map((s) => [s.code, s]));

export function questionsOfSection(sectionCode: string): Question[] {
  return QUESTIONS.filter((q) => q.sectionCode === sectionCode);
}

export function scaleLabelsFor(sectionCode: string) {
  return SECTION_BY_CODE.get(sectionCode)?.scaleLabels ?? DEFAULT_SCALE_LABELS;
}

/** 응답값의 심각도를 구합니다. 리스크 문항이 아니면 0. */
export function severityOf(code: string, value: number | null | undefined): Severity {
  if (value === null || value === undefined) return 0;
  return QUESTION_BY_CODE.get(code)?.risk?.severity[value] ?? 0;
}

/** 설문 전체 문항 번호 (자유의견까지 이어지는 연속 번호) */
export const QUESTION_NUMBER = new Map(
  QUESTIONS.filter((q) => q.sectionCode !== "interview").map((q, i) => [q.code, i + 1]),
);
