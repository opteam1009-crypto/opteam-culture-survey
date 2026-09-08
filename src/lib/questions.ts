// 사내 업무환경·소통 진단 문항 정의.
// 이 파일이 문항의 원본(source of truth)이며, 서버 기동 시 DB로 동기화됩니다.
// 문항을 바꿀 때는 code 를 유지해야 과거 회차와 추이 비교가 이어집니다.
// 문구만 고치는 것은 안전하고, 의미가 달라지면 새 code 를 부여하세요.

export type QuestionType = "scale5" | "text";

export interface Question {
  code: string;
  sectionCode: string;
  prompt: string;
  type: QuestionType;
}

export interface Section {
  code: string;
  label: string;
  description: string;
}

export const SECTIONS: Section[] = [
  {
    code: "env",
    label: "업무 환경",
    description: "일에 집중할 수 있는 물리적·제도적 여건",
  },
  {
    code: "comm",
    label: "소통",
    description: "정보 공유, 부서 간 협업, 의견을 말할 수 있는 분위기",
  },
  {
    code: "lead",
    label: "리더십·피드백",
    description: "상급자의 업무 파악, 피드백과 인정",
  },
  {
    code: "load",
    label: "업무량·워라밸",
    description: "업무량의 적정성과 휴식 보장",
  },
  {
    code: "grow",
    label: "성장·보상",
    description: "성장 기회와 보상·평가의 합리성",
  },
  {
    code: "engage",
    label: "조직 몰입",
    description: "회사와 동료에 대한 신뢰, 잔류 의향",
  },
  {
    code: "open",
    label: "자유 의견",
    description: "직접 남기고 싶은 이야기",
  },
];

export const QUESTIONS: Question[] = [
  // ── 업무 환경 ─────────────────────────────────────────────
  { code: "env_1", sectionCode: "env", type: "scale5", prompt: "업무에 집중할 수 있는 물리적 환경(자리, 소음, 온도, 장비)이 갖춰져 있다." },
  { code: "env_2", sectionCode: "env", type: "scale5", prompt: "업무에 필요한 도구와 시스템(협업툴, 소프트웨어, 장비)이 충분히 제공된다." },
  { code: "env_3", sectionCode: "env", type: "scale5", prompt: "업무 절차와 결재 과정이 불필요하게 복잡하지 않다." },
  { code: "env_4", sectionCode: "env", type: "scale5", prompt: "복지·휴게 제도가 실제로 사용할 수 있는 수준으로 운영된다." },

  // ── 소통 ─────────────────────────────────────────────────
  { code: "comm_1", sectionCode: "comm", type: "scale5", prompt: "부서 안에서 업무에 필요한 정보가 제때 공유된다." },
  { code: "comm_2", sectionCode: "comm", type: "scale5", prompt: "다른 부서와 협업할 때 소통이 원활하다." },
  { code: "comm_3", sectionCode: "comm", type: "scale5", prompt: "회사의 방향성과 주요 결정 사항이 구성원에게 충분히 공유된다." },
  { code: "comm_4", sectionCode: "comm", type: "scale5", prompt: "회의가 목적에 맞게 효율적으로 진행된다." },
  { code: "comm_5", sectionCode: "comm", type: "scale5", prompt: "반대 의견이나 우려를 편하게 말할 수 있는 분위기다." },

  // ── 리더십·피드백 ────────────────────────────────────────
  { code: "lead_1", sectionCode: "lead", type: "scale5", prompt: "상급자는 내가 어떤 업무를 어떤 상황에서 하고 있는지 잘 파악하고 있다." },
  { code: "lead_2", sectionCode: "lead", type: "scale5", prompt: "업무에 대한 피드백을 구체적이고 건설적으로 받는다." },
  { code: "lead_3", sectionCode: "lead", type: "scale5", prompt: "어려움을 이야기했을 때 실질적인 지원이나 조치가 이루어진다." },
  { code: "lead_4", sectionCode: "lead", type: "scale5", prompt: "잘한 일에 대해 적절한 인정을 받는다." },

  // ── 업무량·워라밸 ────────────────────────────────────────
  { code: "load_1", sectionCode: "load", type: "scale5", prompt: "내가 맡은 업무량은 감당 가능한 수준이다." },
  { code: "load_2", sectionCode: "load", type: "scale5", prompt: "팀 안에서 업무 분장이 공정하게 이루어진다." },
  { code: "load_3", sectionCode: "load", type: "scale5", prompt: "예정에 없던 야근이나 주말 근무가 잦지 않다." },
  { code: "load_4", sectionCode: "load", type: "scale5", prompt: "연차와 휴가를 눈치 보지 않고 사용할 수 있다." },

  // ── 성장·보상 ────────────────────────────────────────────
  { code: "grow_1", sectionCode: "grow", type: "scale5", prompt: "이 회사에서 일하며 내 전문성이 성장하고 있다고 느낀다." },
  { code: "grow_2", sectionCode: "grow", type: "scale5", prompt: "교육이나 학습 기회가 충분히 제공된다." },
  { code: "grow_3", sectionCode: "grow", type: "scale5", prompt: "내 기여에 비해 보상(급여·인센티브)이 합리적이라고 생각한다." },
  { code: "grow_4", sectionCode: "grow", type: "scale5", prompt: "평가와 승진의 기준이 투명하게 공유된다." },

  // ── 조직 몰입 ────────────────────────────────────────────
  { code: "engage_1", sectionCode: "engage", type: "scale5", prompt: "나는 회사가 가려는 방향에 공감하고 있다." },
  { code: "engage_2", sectionCode: "engage", type: "scale5", prompt: "동료들을 신뢰하며 함께 일하는 것이 즐겁다." },
  { code: "engage_3", sectionCode: "engage", type: "scale5", prompt: "지인에게 우리 회사를 좋은 직장으로 추천할 수 있다." },
  { code: "engage_4", sectionCode: "engage", type: "scale5", prompt: "앞으로 1년 이상 계속 근무할 의향이 있다." },

  // ── 자유 의견 ────────────────────────────────────────────
  { code: "open_good", sectionCode: "open", type: "text", prompt: "우리 회사에서 가장 잘 되고 있다고 생각하는 점은 무엇인가요?" },
  { code: "open_fix", sectionCode: "open", type: "text", prompt: "가장 시급하게 개선이 필요하다고 생각하는 점은 무엇인가요?" },
  { code: "open_free", sectionCode: "open", type: "text", prompt: "그 밖에 직접 전하고 싶은 이야기가 있다면 자유롭게 적어주세요." },
];

export const SCALE_LABELS = [
  { value: 1, label: "전혀 아니다" },
  { value: 2, label: "아닌 편이다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그런 편이다" },
  { value: 5, label: "매우 그렇다" },
];

export const SCALE_QUESTIONS = QUESTIONS.filter((q) => q.type === "scale5");
export const TEXT_QUESTIONS = QUESTIONS.filter((q) => q.type === "text");

export const QUESTION_BY_CODE = new Map(QUESTIONS.map((q) => [q.code, q]));
export const SECTION_BY_CODE = new Map(SECTIONS.map((s) => [s.code, s]));

export function questionsOfSection(sectionCode: string): Question[] {
  return QUESTIONS.filter((q) => q.sectionCode === sectionCode);
}
