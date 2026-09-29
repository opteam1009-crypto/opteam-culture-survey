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

/** 받는 주제. 문서의 네 가지에 「기타」를 더했습니다. */
export const SUGGESTION_TOPICS = [
  {
    value: "process",
    label: "불필요한 업무·절차·비용",
    hint: "안 해도 되는 일, 겹치는 절차, 줄일 수 있는 비용",
  },
  {
    value: "report",
    label: "비효율적인 보고·지시 체계",
    hint: "보고가 겹치거나, 지시가 여러 갈래로 내려오는 것",
  },
  {
    value: "direction",
    label: "회사 방향",
    hint: "우리가 어디로 가야 하는지에 대한 생각",
  },
  {
    value: "revenue",
    label: "매출 증대",
    hint: "새로운 수익, 기존 사업을 키우는 방법",
  },
  { value: "etc", label: "그 밖의 개선 제안", hint: "위에 딱 맞지 않는 개선 아이디어" },
] as const;

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
  { value: "routed", label: "다른 창구로 이관", tone: { bg: "#f3eefb", ink: "#54308f" } },
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
    placeholder: "예) 주간보고를 팀장·본부장에게 각각 따로 올리고 있어 같은 내용을 두 번 씁니다.",
  },
  {
    code: "proposal",
    label: "제안",
    prompt: "어떻게 바꾸면 좋을까요?",
    placeholder: "예) 하나의 양식으로 합치고 공유 문서 한 곳에만 올리면 좋겠습니다.",
  },
  {
    code: "expect",
    label: "기대효과",
    prompt: "바뀌면 무엇이 나아지나요?",
    placeholder: "예) 팀당 주 1시간 정도 아낄 수 있고, 보고 내용이 엇갈리지 않습니다.",
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
