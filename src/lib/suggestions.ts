/**
 * 성장 제안제도.
 *
 * 월별 정기설문을 대신하는 상시 창구입니다. 설문과 달리 점수를 매기지 않고,
 * 「회사를 더 낫게 만드는 제안」만 받습니다.
 *
 * 설계에서 가장 중요한 것은 **무엇을 받지 않는가** 입니다. 개인 간 갈등이나
 * 특정인에 대한 불만이 이리로 들어오면, 기획운영팀과 대표가 그 갈등을 대신
 * 해결해 주는 창구가 되어버립니다. 정기설문을 접는 이유가 바로 그것이었습니다.
 * 그래서 화면에서 먼저 갈라 보내고(고충처리위원·괴롭힘 신고), 그래도 들어온 건은
 * 관리자가 「이관」으로 표시해 넘깁니다.
 */

/**
 * 제도 이름. 접수 화면 제목, 대시보드 메뉴, 알림 메일, PDF 파일명에 쓰입니다.
 * 이름을 바꿀 때는 여기만 고치면 됩니다.
 */
export const PROGRAM = {
  /** 접수 화면 제목 */
  name: "성장 제안제도",
  /** 메뉴·메일 머리말처럼 짧게 부를 때 */
  short: "성장 제안",
  /** PDF 파일명 앞머리(띄어쓰기 없이) */
  file: "성장제안",
};

/** 한 주제의 작성 예시. 제목과 1장 양식 세 칸에 회색 글씨로 보입니다. */
export interface SuggestionExample {
  title: string;
  situation: string;
  proposal: string;
  expect: string;
}

/**
 * 받는 주제. 문서의 네 가지에 「기타」를 더했습니다.
 *
 * 주제마다 예시를 따로 둡니다. 「매출 증대」를 골랐는데 주간보고 예시가 보이면
 * 무엇을 어느 정도로 쓰라는 건지 감이 오지 않습니다. 고른 주제에 맞는 한 벌을
 * 보여주면 그 틀에 맞춰 쓰기 쉬워집니다.
 */
export const SUGGESTION_TOPICS: {
  value: string;
  label: string;
  hint: string;
  example: SuggestionExample;
}[] = [
  {
    value: "process",
    label: "불필요한 업무·절차·비용",
    hint: "불필요하거나 중복되는 업무·절차, 절감 가능한 비용",
    example: {
      title: "소액 비품 구매 결재 단계 줄이기",
      situation:
        "5만 원 이하 소모품도 팀장·본부장·대표님 3단계 결재를 거쳐서, 사는 데 일주일씩 걸립니다.",
      proposal: "5만 원 이하는 팀장 전결로 바꾸고, 월말에 한 번에 모아 보고하면 좋겠습니다.",
      expect: "구매 대기 시간이 일주일에서 하루로 줄고, 윗선의 결재 건수도 줄어듭니다.",
    },
  },
  {
    value: "report",
    label: "비효율적인 보고·지시 체계",
    hint: "중복되는 보고, 일관되지 않은 지시 체계",
    example: {
      title: "주간보고 이중 작성 없애기",
      situation: "주간보고를 팀장·본부장에게 각각 따로 올리고 있어 같은 내용을 두 번 씁니다.",
      proposal: "하나의 양식으로 합치고 공유 문서 한 곳에만 올리면 좋겠습니다.",
      expect: "팀당 주 1시간 정도 아낄 수 있고, 보고 내용이 서로 엇갈리지 않습니다.",
    },
  },
  {
    value: "direction",
    label: "회사 방향",
    hint: "회사가 나아갈 방향과 전략에 대한 의견",
    example: {
      title: "분기별로 집중할 사업 하나 정하기",
      situation:
        "여러 신규 사업을 동시에 진행하다 보니 인력이 흩어지고, 어느 것도 성과가 뚜렷하지 않습니다.",
      proposal:
        "분기마다 가장 가능성이 큰 사업 하나를 정해 인력과 예산을 먼저 배정하면 좋겠습니다.",
      expect: "성과가 나는 곳에 힘이 모이고, 직원들도 무엇이 우선인지 분명히 알 수 있습니다.",
    },
  },
  {
    value: "revenue",
    label: "매출 증대",
    hint: "신규 수익원 발굴, 기존 사업 확대 방안",
    example: {
      title: "기존 고객 재구매 안내 보내기",
      situation: "한 번 구매한 고객에게 다시 연락하는 절차가 없어 재구매로 이어지는 경우가 적습니다.",
      proposal: "구매 후 3개월·6개월 시점에 맞춤 혜택 안내를 자동으로 보내면 좋겠습니다.",
      expect: "새 고객을 모으는 것보다 비용이 적게 들고, 재구매율을 높일 수 있습니다.",
    },
  },
  {
    value: "etc",
    label: "그 밖의 개선 제안",
    hint: "그 밖의 업무 환경·제도 개선 의견",
    example: {
      title: "신규 입사자 안내 자료 만들기",
      situation: "신규 입사자가 올 때마다 사수가 같은 내용을 처음부터 말로 설명하고 있습니다.",
      proposal: "시스템 사용법·결재 방법·연락처처럼 자주 묻는 내용을 문서 하나로 정리해 두면 좋겠습니다.",
      expect: "사수의 설명 시간이 줄고, 신규 입사자가 더 빨리 적응할 수 있습니다.",
    },
  },
];

/**
 * 고른 주제의 예시. 아직 고르지 않았으면 가장 흔한 「보고·지시 체계」 예시를
 * 보여줍니다. 빈 칸만 덩그러니 있으면 어느 정도로 써야 할지 감이 오지 않습니다.
 */
export function exampleFor(topic: string): SuggestionExample {
  const found = SUGGESTION_TOPICS.find((t) => t.value === topic);
  return (found ?? SUGGESTION_TOPICS[1]).example;
}

export const TOPIC_LABEL: Record<string, string> = Object.fromEntries(
  SUGGESTION_TOPICS.map((t) => [t.value, t.label]),
);

export const VALID_TOPICS: ReadonlySet<string> = new Set<string>(
  SUGGESTION_TOPICS.map((t) => t.value),
);

/**
 * 제안의 처리 단계.
 *
 * 「이관」이 있는 이유: 개인 불만이 들어왔을 때 그냥 미채택으로 닫으면 제안자는
 * 묵살당했다고 느끼고, 정작 가야 할 고충처리위원에게는 가지 않습니다.
 * 닫는 것과 넘기는 것을 구분해 둡니다.
 */
export const SUGGESTION_STATUSES = [
  { value: "received", label: "접수", tone: { bg: "#eef3fb", ink: "#1f4d8f" } },
  { value: "reviewing", label: "검토중", tone: { bg: "#fdeee7", ink: "#93441f" } },
  { value: "adopted", label: "채택", tone: { bg: "#e7f6e7", ink: "#056b05" } },
  { value: "rejected", label: "미채택", tone: { bg: "#f0efec", ink: "#52514e" } },
  { value: "routed", label: "담당 창구로 전달", tone: { bg: "#f3eefb", ink: "#54308f" } },
] as const;

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]["value"];

export const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  SUGGESTION_STATUSES.map((s) => [s.value, s.label]),
);

export const VALID_STATUSES: ReadonlySet<string> = new Set<string>(
  SUGGESTION_STATUSES.map((s) => s.value),
);

export function statusTone(value: string): { bg: string; ink: string } {
  return (
    SUGGESTION_STATUSES.find((s) => s.value === value)?.tone ?? { bg: "#f0efec", ink: "#52514e" }
  );
}

/** 회신이 끝난 단계. 목록에서 「회신 대기」를 세는 데 씁니다. */
export function isClosed(status: string): boolean {
  return status === "adopted" || status === "rejected" || status === "routed";
}

/**
 * 1장 양식. 세 칸을 넘기지 않습니다.
 * 칸이 많아지면 쓰다 말고 닫습니다. 상시 창구는 쓰기 쉬워야 들어옵니다.
 */
export const SUGGESTION_FIELDS = [
  {
    code: "situation",
    label: "현황",
    prompt: "지금은 어떻게 되어 있나요?",
  },
  {
    code: "proposal",
    label: "제안",
    prompt: "어떻게 바꾸면 좋을까요?",
  },
  {
    code: "expect",
    label: "기대효과",
    prompt: "바뀌면 무엇이 나아지나요?",
  },
] as const;

export const MAX_TITLE = 80;
export const MAX_NAME = 40;
export const MAX_BODY = 2000;

/** 한 건의 제안. */
export interface Suggestion {
  id: string;
  period: string;
  submitted_at: string;
  proposer_name: string;
  department_id: number | null;
  department_name: string;
  topic: string;
  title: string;
  situation: string;
  proposal: string;
  expect: string;
  status: string;
  reply: string;
  replied_at: string | null;
  handled_by: string;
}
