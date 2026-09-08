import { QUESTIONS, SCORED_QUESTIONS, severityOf } from "./questions";
import { computeScores } from "./score";
import { currentPeriod, previousPeriod } from "./period";

export interface DemoResponse {
  period: string;
  name: string;
  department: string;
  visibility: "both" | "ceo_only";
  numeric: Record<string, number>;
  texts: Record<string, string>;
  overall: number | null;
  sections: Record<string, number>;
  riskLevel: number;
  submittedAt: Date;
}

/** 예시 데이터임이 목록에서 바로 보이도록 이름 앞에 붙입니다. */
export const DEMO_PREFIX = "[예시] ";

const NAMES = [
  "김서준", "이하늘", "박도윤", "최지우", "정은서", "강민준", "조서연", "윤시우",
  "장하윤", "임예준", "한소율", "오건우", "신다인", "권주원", "황수아", "안지호",
  "송채원", "홍준서", "문가은", "배현우",
];

const TEAMS = [
  "기획운영팀", "회계팀", "운영관리팀", "개발팀", "퍼포먼스팀",
  "영상컨텐츠팀", "매장컨텐츠팀", "컨텐츠팀", "부동산팀", "마케팅부",
];

// 팀별 성향. 값이 클수록 전반적으로 후한 응답을 합니다.
const TEAM_BIAS: Record<string, number> = {
  기획운영팀: 0.3,
  회계팀: 0.15,
  운영관리팀: -0.1,
  개발팀: 0.45,
  퍼포먼스팀: -0.55,
  영상컨텐츠팀: -0.3,
  매장컨텐츠팀: 0.05,
  컨텐츠팀: 0.2,
  부동산팀: -0.15,
  마케팅부: -0.4,
};

// 영역별 성향. 보상과 소통이 상대적으로 낮게 나오도록 두어
// 개선 우선순위 문항이 의미 있게 뽑히는지 볼 수 있게 합니다.
const SECTION_BIAS: Record<string, number> = {
  cond: 0.0,
  lead: -0.25,
  growth: -0.35,
  org: 0.1,
  retention: 0.15,
};

const KEEP_TEXTS = [
  "팀 내에서 서로 도와주는 분위기는 계속 유지됐으면 합니다.",
  "재택 하루는 정말 도움이 됩니다. 유지해 주세요.",
  "월요일 주간회의가 짧고 명확해서 좋습니다.",
  "필요한 장비를 빠르게 지원해 주는 점이 좋습니다.",
  "팀장님이 먼저 상황을 물어봐 주시는 게 큰 힘이 됩니다.",
];

const IMPROVE_TEXTS = [
  "업무 요청이 여러 경로로 들어와서 우선순위가 계속 바뀝니다. 창구를 하나로 모아주세요.",
  "평가 기준이 명확하지 않아서 무엇을 잘해야 하는지 모르겠습니다.",
  "회의가 너무 많습니다. 절반은 문서로 대체 가능해 보입니다.",
  "인원 대비 업무량이 많습니다. 충원이 필요합니다.",
  "다른 팀에 자료를 요청하면 회신이 늦어 일정이 계속 밀립니다.",
  "연차를 쓸 때 눈치가 보입니다. 제도만 있고 실제로는 쓰기 어렵습니다.",
];

const IDEA_TEXTS = [
  "반복 문의를 정리해서 FAQ를 만들면 응대 시간을 줄일 수 있을 것 같습니다.",
  "고객 이탈 시점 데이터를 모아보면 원인을 찾을 수 있을 것 같습니다.",
  "업무 매뉴얼을 한곳에 모아두면 신규 입사자 온보딩이 훨씬 빨라집니다.",
  "정기 리포트를 자동화하면 매달 이틀은 아낄 수 있습니다.",
];

const CEO_TEXTS = [
  "회사가 어디로 가는지 분기마다 한 번은 직접 들려주시면 좋겠습니다.",
  "현장에서 느끼는 어려움을 이야기할 자리가 더 있었으면 합니다.",
  "지금 방향에는 공감합니다. 속도만 조금 조절되면 좋겠습니다.",
];

const SLOTS = [
  "화요일 오후 2시 이후", "목요일 오전 10시~12시", "금요일 오후 3시 이후",
  "수요일 점심 이후 아무때나", "월요일 오전", "목요일 오후 4시 이후",
];

const TOPICS = ["", "", "업무 분장", "커리어 방향", "", "업무량 조정", ""];

/** 결정론적 난수. 같은 입력이면 항상 같은 예시 데이터가 나옵니다. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp5(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

/**
 * 최근 6회차 분량의 예시 응답을 만듭니다.
 * 중간에 한 번 떨어졌다가 회복하는 흐름을 넣어 월별 추이 그래프가
 * 평평하지 않게 보이도록 했습니다.
 */
export function buildDemoResponses(seed = 20260908): DemoResponse[] {
  const rand = mulberry32(seed);
  const periods: string[] = [];
  let p = currentPeriod();
  for (let i = 0; i < 6; i++) {
    periods.unshift(p);
    p = previousPeriod(p);
  }

  // 회차별 전체 분위기: 완만한 하락 뒤 회복
  const monthBase = [3.7, 3.6, 3.35, 3.1, 3.3, 3.55];

  const out: DemoResponse[] = [];

  periods.forEach((period, monthIndex) => {
    const base = monthBase[monthIndex];
    const headcount = 9 + Math.floor(rand() * 4); // 9~12명
    const picked = new Set<number>();

    for (let i = 0; i < headcount; i++) {
      let nameIndex = Math.floor(rand() * NAMES.length);
      while (picked.has(nameIndex)) nameIndex = (nameIndex + 1) % NAMES.length;
      picked.add(nameIndex);

      const department = TEAMS[Math.floor(rand() * TEAMS.length)];
      const personBias = (rand() - 0.5) * 0.9;

      const numeric: Record<string, number> = {};
      for (const question of SCORED_QUESTIONS) {
        const value =
          base +
          (TEAM_BIAS[department] ?? 0) +
          (SECTION_BIAS[question.sectionCode] ?? 0) +
          personBias +
          (rand() - 0.5) * 0.8;
        numeric[question.code] = clamp5(value);
      }

      // 만족도가 낮을수록 리스크 신호가 나올 확률을 높입니다.
      const mood = (numeric.org_3 ?? 3) + (numeric.retention_1 ?? 3);
      const riskChance = mood <= 4 ? 0.75 : mood <= 6 ? 0.3 : 0.08;

      numeric.retention_2 =
        rand() < riskChance ? 2 + Math.floor(rand() * 4) : rand() < 0.7 ? 1 : 2;
      numeric.risk_1 = rand() < riskChance ? (rand() < 0.55 ? 2 : 3) : 1;
      numeric.risk_2 = rand() < riskChance * 0.45 ? (rand() < 0.6 ? 2 : 3) : 1;
      numeric.risk_3 = rand() < riskChance * 0.8 ? (rand() < 0.6 ? 2 : 3) : 1;

      const texts: Record<string, string> = {
        interview_first: SLOTS[Math.floor(rand() * SLOTS.length)],
        interview_second: SLOTS[Math.floor(rand() * SLOTS.length)],
      };
      const topic = TOPICS[Math.floor(rand() * TOPICS.length)];
      if (topic) texts.interview_topic = topic;
      if (rand() < 0.65) texts.voice_keep = KEEP_TEXTS[Math.floor(rand() * KEEP_TEXTS.length)];
      if (rand() < 0.8) texts.voice_improve = IMPROVE_TEXTS[Math.floor(rand() * IMPROVE_TEXTS.length)];
      if (rand() < 0.4) texts.voice_idea = IDEA_TEXTS[Math.floor(rand() * IDEA_TEXTS.length)];
      if (rand() < 0.3) texts.ceo_message = CEO_TEXTS[Math.floor(rand() * CEO_TEXTS.length)];

      const { overall, sections } = computeScores(numeric);
      const riskLevel = Math.max(
        0,
        ...Object.entries(numeric).map(([code, value]) => severityOf(code, value)),
      );

      // 낮은 점수일수록 대표이사에게만 보내는 비율을 높입니다.
      const visibility: "both" | "ceo_only" =
        rand() < (mood <= 5 ? 0.45 : 0.12) ? "ceo_only" : "both";

      const [year, month] = period.split("-").map(Number);
      const day = 3 + Math.floor(rand() * 22);
      const hour = 9 + Math.floor(rand() * 10);
      const submittedAt = new Date(Date.UTC(year, month - 1, day, hour, Math.floor(rand() * 60)));

      out.push({
        period,
        name: DEMO_PREFIX + NAMES[nameIndex],
        department,
        visibility,
        numeric,
        texts,
        overall,
        sections,
        riskLevel,
        submittedAt,
      });
    }
  });

  return out;
}

export const DEMO_QUESTION_CODES = QUESTIONS.map((q) => q.code);
