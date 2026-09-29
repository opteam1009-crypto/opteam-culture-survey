/**
 * 전담 창구: 개인 고충(노사협의회 고충처리위원)과 직장 내 괴롭힘 신고.
 *
 * 접수 내용은 confidential_reports 에 남고 대시보드 「고충·신고」에서 처리합니다.
 * 담당자 메일(GRIEVANCE_EMAILS / HARASSMENT_EMAILS)을 넣으면 같은 내용이
 * 메일로도 갑니다. 메일이 없어도 접수는 받습니다.
 *
 * 설정 화면의 알림 기록(notification_log)에는 남기지 않습니다. 그 화면은 메일
 * 본문까지 보여주는데, 고충·신고는 전용 화면에서만 보는 게 맞습니다.
 *
 * 직원에게 보이는 문구는 사실이어야 합니다. 누가 읽는지를 실제보다 좁게 적으면
 * (「○○만 확인합니다」) 믿고 쓴 사람을 속이는 셈입니다. 열람 범위를 바꾸면
 * 여기 문구도 함께 고쳐 주세요.
 */

export type ConfidentialKind = "grievance" | "harassment";

export interface ConfidentialField {
  code: string;
  label: string;
  prompt: string;
  placeholder: string;
  required: boolean;
  rows?: number;
}

export interface ConfidentialChannel {
  kind: ConfidentialKind;
  /** 주소 뒷부분. /grievance, /harassment */
  path: string;
  /** 화면 제목 */
  title: string;
  /** 누가 받는지. 화면에 그대로 보여줍니다. 누가 읽는지 알아야 안심하고 씁니다. */
  receiver: string;
  /** 머리말 아래 안내 문단 */
  intro: string;
  /** 받는 사람 메일 주소를 담은 환경변수 */
  recipientsEnv: string;
  /** 본문 칸 */
  fields: ConfidentialField[];
  /** 제출 뒤 안내 */
  after: string;
  /** 메일 제목 머리말 */
  mailTag: string;
}

export const CONFIDENTIAL_CHANNELS: Record<ConfidentialKind, ConfidentialChannel> = {
  grievance: {
    kind: "grievance",
    path: "/grievance",
    title: "개인 고충 접수",
    receiver: "노사협의회 고충처리위원",
    intro:
      "근무 중 겪고 계신 고충을 접수합니다. 담당자가 내용을 확인하고, 접수일로부터 10일 이내에 처리 결과를 알려드립니다.",
    recipientsEnv: "GRIEVANCE_EMAILS",
    fields: [
      {
        code: "what",
        label: "고충 내용",
        prompt: "어떤 상황인지 적어주세요. 정리되지 않아도 괜찮습니다.",
        placeholder: "예) 업무 분장이 명확하지 않아 제가 맡은 일이 계속 늘어나고 있습니다.",
        required: true,
        rows: 6,
      },
      {
        code: "hope",
        label: "바라는 점",
        prompt: "어떻게 되면 좋을지 생각해 두신 것이 있다면 적어주세요.",
        placeholder: "예) 팀장님과 함께 업무 범위를 다시 정리하는 자리가 있으면 좋겠습니다.",
        required: false,
        rows: 3,
      },
    ],
    after: "담당자가 내용을 확인한 뒤 연락드리며, 접수일로부터 10일 이내에 처리 결과를 알려드립니다.",
    mailTag: "고충 접수",
  },
  harassment: {
    kind: "harassment",
    path: "/harassment",
    title: "직장 내 괴롭힘 신고",
    receiver: "직장 내 괴롭힘 신고 담당자",
    intro:
      "직접 겪으셨거나 목격하신 일 모두 신고하실 수 있습니다. 신고가 접수되면 회사는 즉시 사실관계를 확인하며, 신고를 이유로 불리한 처우를 하는 것은 법으로 금지되어 있습니다.",
    recipientsEnv: "HARASSMENT_EMAILS",
    fields: [
      {
        code: "who",
        label: "누가 겪은 일인가요?",
        prompt: "본인이 겪으신 일인지, 다른 분이 겪는 것을 보신 일인지 적어주세요.",
        placeholder: "예) 제가 직접 겪었습니다. / 같은 팀 동료가 겪는 것을 보았습니다.",
        required: true,
        rows: 2,
      },
      {
        code: "what",
        label: "어떤 일이 있었나요?",
        prompt: "언제, 어디서, 어떤 일이 있었는지 기억나는 대로 적어주세요.",
        placeholder: "예) 9월 초부터 회의 때마다 여러 사람 앞에서 반복해서 모욕적인 말을 들었습니다.",
        required: true,
        rows: 6,
      },
      {
        code: "people",
        label: "관련된 분",
        prompt: "행위를 한 분, 함께 본 분이 있다면 적어주세요. 사실 확인에 필요합니다.",
        placeholder: "예) ○○팀 ○○○ / 함께 본 사람: ○○팀 ○○○",
        required: false,
        rows: 2,
      },
      {
        code: "hope",
        label: "바라는 조치",
        prompt: "원하시는 조치가 있다면 적어주세요.",
        placeholder: "예) 우선 업무 자리를 분리해 주셨으면 합니다.",
        required: false,
        rows: 3,
      },
    ],
    after:
      "담당자가 내용을 확인한 뒤 연락드립니다. 신고하신 분의 신원과 내용은 조사와 처리에 필요한 범위에서만 다룹니다.",
    mailTag: "괴롭힘 신고",
  },
};

export function isConfidentialKind(value: string): value is ConfidentialKind {
  return value === "grievance" || value === "harassment";
}

/** 받는 사람 주소. 예시값(CHANGE_ME·바꾸세요)은 없는 것으로 봅니다. */
export function confidentialRecipients(kind: ConfidentialKind): string[] {
  const raw = process.env[CONFIDENTIAL_CHANNELS[kind].recipientsEnv] ?? "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"))
    .filter((s) => !s.startsWith("CHANGE_ME") && !s.startsWith("바꾸세요"));
}

/**
 * 담당자 메일로도 보낼 수 있는지. 받는 주소와 발송 수단이 모두 있어야 합니다.
 * 없어도 접수는 받습니다(대시보드에 남습니다).
 */
export function confidentialMailReady(kind: ConfidentialKind): boolean {
  const canSend =
    Boolean(process.env.RESEND_API_KEY) ||
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return canSend && confidentialRecipients(kind).length > 0;
}

/** 처리 단계. */
export const REPORT_STATUSES = [
  { value: "received", label: "접수", tone: { bg: "#eef3fb", ink: "#1f4d8f" } },
  { value: "handling", label: "처리중", tone: { bg: "#fdeee7", ink: "#93441f" } },
  { value: "done", label: "처리 완료", tone: { bg: "#e7f6e7", ink: "#056b05" } },
] as const;

export const REPORT_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_STATUSES.map((s) => [s.value, s.label]),
);

export const VALID_REPORT_STATUSES: ReadonlySet<string> = new Set<string>(
  REPORT_STATUSES.map((s) => s.value),
);

export function reportTone(status: string): { bg: string; ink: string } {
  return REPORT_STATUSES.find((s) => s.value === status)?.tone ?? { bg: "#f0efec", ink: "#52514e" };
}

/** 개인 고충은 들은 날부터 10일 이내에 결과를 알려야 합니다(근로자참여법). */
export const GRIEVANCE_DEADLINE_DAYS = 10;

export interface ConfidentialReport {
  id: string;
  kind: ConfidentialKind;
  submitted_at: string;
  reporter_name: string;
  department_name: string;
  contact: string;
  body: Record<string, string>;
  status: string;
  note: string;
  handled_by: string;
  updated_at: string | null;
  delivery_status: string;
}

export const MAX_CONTACT = 80;
export const MAX_FIELD = 3000;
