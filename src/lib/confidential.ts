/**
 * 전담 창구: 개인 고충(노사협의회 고충처리위원)과 직장 내 괴롭힘 신고.
 *
 * 제안제도와 가장 다른 점은 **누가 읽는가** 입니다.
 *
 * - 대표·인사 대시보드에는 어떤 형태로도 나오지 않습니다. 신고 대상이 대표나
 *   인사 담당자일 수 있고, 괴롭힘 조사에 관여한 사람은 알게 된 비밀을 누설하면
 *   안 됩니다(근로기준법 제76조의3 제7항).
 * - 지정한 담당자의 메일로만 보냅니다(GRIEVANCE_EMAILS / HARASSMENT_EMAILS).
 * - 설정 화면의 알림 기록(notification_log)에도 남기지 않습니다. 그 화면은
 *   대표·인사가 보고, 메일 본문까지 보여줍니다.
 * - 받을 사람이 등록되지 않았으면 접수 자체를 받지 않고, 제안 화면의 안내 줄도
 *   링크가 되지 않습니다. 아무도 읽지 않는 곳에 신고가 쌓이면 안 됩니다.
 *
 * 메일이 실패해도 신고가 사라지지 않도록 confidential_reports 테이블에 남깁니다.
 * 이 테이블은 어떤 화면에서도 읽지 않습니다.
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
  /** 머리말 아래 안내 문단(문장 단위로 줄을 바꿉니다) */
  intro: string[];
  /** 받는 사람 메일 주소를 담은 환경변수 */
  recipientsEnv: string;
  /** 본문 칸 */
  fields: ConfidentialField[];
  /** 제출 뒤 안내(문장 단위) */
  after: string[];
  /** 메일 제목 머리말 */
  mailTag: string;
}

export const CONFIDENTIAL_CHANNELS: Record<ConfidentialKind, ConfidentialChannel> = {
  grievance: {
    kind: "grievance",
    path: "/grievance",
    title: "개인 고충 접수",
    receiver: "노사협의회 고충처리위원",
    intro: [
      "회사생활에서 겪는 어려움을 편하게 말씀해 주세요.",
      "적어주신 내용은 고충처리위원만 확인하며, 10일 이내에 처리 결과를 알려드립니다.",
    ],
    recipientsEnv: "GRIEVANCE_EMAILS",
    fields: [
      {
        code: "what",
        label: "어떤 어려움이 있으신가요?",
        prompt: "상황을 편하게 적어주세요. 정리되지 않아도 괜찮습니다.",
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
    after: [
      "고충처리위원이 내용을 확인한 뒤 연락드립니다.",
      "10일 이내에 처리 결과를 알려드립니다.",
    ],
    mailTag: "고충 접수",
  },
  harassment: {
    kind: "harassment",
    path: "/harassment",
    title: "직장 내 괴롭힘 신고",
    receiver: "직장 내 괴롭힘 신고 담당자",
    intro: [
      "직접 겪으셨거나 곁에서 보신 일 모두 신고하실 수 있습니다.",
      "신고가 접수되면 회사는 지체 없이 사실관계를 확인합니다.",
      "신고했다는 이유로 불리한 처우를 하는 것은 법으로 금지되어 있습니다.",
    ],
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
    after: [
      "신고 담당자가 내용을 확인한 뒤 연락드립니다.",
      "회사는 지체 없이 사실관계를 확인하며, 신고하신 분의 신원과 내용은 조사에 필요한 범위에서만 다룹니다.",
    ],
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
 * 이 창구를 열어도 되는지. 받는 사람이 있고, 메일을 보낼 수단이 있어야 합니다.
 * 둘 중 하나라도 없으면 신고가 아무에게도 닿지 않습니다.
 */
export function confidentialReady(kind: ConfidentialKind): boolean {
  const canSend =
    Boolean(process.env.RESEND_API_KEY) ||
    Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return canSend && confidentialRecipients(kind).length > 0;
}

export const MAX_CONTACT = 80;
export const MAX_FIELD = 3000;
