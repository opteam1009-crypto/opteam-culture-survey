/**
 * 직장 내 괴롭힘 신고서 + 피해사실 상세기술서(고용노동부 양식 구성).
 *
 * 화면은 신고서 1~9항 순서를 그대로 따르고, 상세기술서는 사건별로 적습니다.
 * 두 서식에 겹치는 항목(목격자·피해 내용·증거자료)은 신고서 쪽 한 곳에만 받아
 * 같은 내용을 두 번 쓰지 않게 합니다. 대시보드·메일·인쇄에서는 harassmentDocument()
 * 가 서식 순서대로 다시 펼칩니다.
 *
 * 저장은 confidential_reports.body(jsonb)에 form: "harassment-v2" 로 합니다.
 * 이전 방식(who/what/people/hope)으로 접수된 건은 그대로 두고 예전 모양으로 보여줍니다.
 */

export const HARASSMENT_FORM = "harassment-v2" as const;

/** 상세기술서 끝의 확인 문구(필수). 문구를 바꾸지 마세요. */
export const PLEDGE_TEXT =
  "위 내용은 본인이 직접 경험하거나 확인한 사실을 중심으로 작성하였으며, 추가적인 사실 확인이 필요한 경우 회사의 조사에 협조하겠습니다.";

export const EVIDENCE_TYPES = [
  { value: "messenger", label: "카카오톡, 문자, 사내 메신저" },
  { value: "email", label: "이메일" },
  { value: "recording", label: "녹음 및 녹취자료" },
  { value: "media", label: "사진 및 영상" },
  { value: "documents", label: "업무지시 내역 및 관련 문서" },
  { value: "other", label: "기타 관련 자료" },
] as const;

export const REQUEST_TYPES = [
  { value: "investigate", label: "사실관계 조사" },
  { value: "separate", label: "피신고인과의 분리 등 보호조치" },
  { value: "relocate", label: "근무장소 변경" },
  { value: "leave", label: "유급휴가 등 필요한 보호조치" },
  { value: "other", label: "기타 요청사항" },
] as const;

export const MAX_SHORT = 100;
export const MAX_LONG = 3000;
export const MAX_WITNESSES = 10;
export const MAX_EVIDENCE_ITEMS = 20;
export const MAX_INCIDENTS = 10;

export interface Witness {
  name: string;
  affiliation: string;
  knows: string;
}
export interface EvidenceItem {
  name: string;
  date: string;
  proves: string;
}
export interface Incident {
  when: string;
  place: string;
  context: string;
  facts: string;
  response: string;
  after: string;
}

/** 접수 화면이 보내는 값(성명·소속·연락처는 따로 보냅니다). */
export interface HarassmentInput {
  position: string;
  accused: { name: string; department: string; position: string; relation: string };
  report: { period: string; place: string; acts: string; background: string; repeat: string };
  witnesses: Witness[];
  evidenceTypes: string[];
  evidenceItems: EvidenceItem[];
  damage: { impact: string; ongoing: string };
  requests: string[];
  requestOther: string;
  incidents: Incident[];
  other: string;
  pledge: boolean;
  signature: string;
}

export interface HarassmentBody extends Omit<HarassmentInput, "pledge"> {
  form: typeof HARASSMENT_FORM;
  pledge: true;
}

export function isHarassmentBody(body: unknown): body is HarassmentBody {
  return Boolean(body && typeof body === "object" && (body as { form?: unknown }).form === HARASSMENT_FORM);
}

export const emptyWitness = (): Witness => ({ name: "", affiliation: "", knows: "" });
export const emptyEvidenceItem = (): EvidenceItem => ({ name: "", date: "", proves: "" });
export const emptyIncident = (): Incident => ({
  when: "",
  place: "",
  context: "",
  facts: "",
  response: "",
  after: "",
});

/** 서명 비교용. 띄어쓰기만 다른 것은 같은 이름으로 봅니다. */
export const sameName = (a: string, b: string) =>
  a.replace(/\s+/g, "") !== "" && a.replace(/\s+/g, "") === b.replace(/\s+/g, "");

// ── 서버 검사 ───────────────────────────────────────────────────────────

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const pick = (v: unknown, allowed: readonly { value: string }[]) =>
  Array.from(
    new Set(list(v, allowed.length).filter((x): x is string => allowed.some((a) => a.value === x))),
  );

/**
 * 접수 요청을 검사해 저장할 모양으로 만듭니다. 필수: 신고인 성명·소속·연락처,
 * 피신고인 성명, 주요 행위 또는 발언, 확인 문구 동의와 서명(신고인 성명과 같아야 함).
 * 빈 줄(목격자·자료·사건)은 버립니다.
 */
export function parseHarassment(
  payload: Record<string, unknown>,
  reporterName: string,
): { ok: true; body: HarassmentBody } | { ok: false; error: string } {
  const accused = rec(payload.accused);
  const report = rec(payload.report);
  const damage = rec(payload.damage);

  const body: HarassmentBody = {
    form: HARASSMENT_FORM,
    position: str(payload.position, MAX_SHORT),
    accused: {
      name: str(accused.name, MAX_SHORT),
      department: str(accused.department, MAX_SHORT),
      position: str(accused.position, MAX_SHORT),
      relation: str(accused.relation, MAX_SHORT),
    },
    report: {
      period: str(report.period, MAX_SHORT),
      place: str(report.place, MAX_SHORT),
      acts: str(report.acts, MAX_LONG),
      background: str(report.background, MAX_LONG),
      repeat: str(report.repeat, MAX_SHORT),
    },
    witnesses: list(payload.witnesses, MAX_WITNESSES)
      .map((w) => rec(w))
      .map((w) => ({
        name: str(w.name, MAX_SHORT),
        affiliation: str(w.affiliation, MAX_SHORT),
        knows: str(w.knows, MAX_LONG),
      }))
      .filter((w) => w.name || w.affiliation || w.knows),
    evidenceTypes: pick(payload.evidenceTypes, EVIDENCE_TYPES),
    evidenceItems: list(payload.evidenceItems, MAX_EVIDENCE_ITEMS)
      .map((e) => rec(e))
      .map((e) => ({
        name: str(e.name, MAX_SHORT),
        date: str(e.date, MAX_SHORT),
        proves: str(e.proves, MAX_LONG),
      }))
      .filter((e) => e.name || e.date || e.proves),
    damage: { impact: str(damage.impact, MAX_LONG), ongoing: str(damage.ongoing, MAX_LONG) },
    requests: pick(payload.requests, REQUEST_TYPES),
    requestOther: str(payload.requestOther, MAX_LONG),
    incidents: list(payload.incidents, MAX_INCIDENTS)
      .map((i) => rec(i))
      .map((i) => ({
        when: str(i.when, MAX_SHORT),
        place: str(i.place, MAX_SHORT),
        context: str(i.context, MAX_LONG),
        facts: str(i.facts, MAX_LONG),
        response: str(i.response, MAX_LONG),
        after: str(i.after, MAX_LONG),
      }))
      .filter((i) => Object.values(i).some(Boolean)),
    other: str(payload.other, MAX_LONG),
    signature: str(payload.signature, MAX_SHORT),
    pledge: true,
  };

  if (!body.accused.name) return { ok: false, error: "피신고인 성명을 적어주세요." };
  if (!body.report.acts) return { ok: false, error: "「주요 행위 또는 발언」을 적어주세요." };
  if (payload.pledge !== true) return { ok: false, error: "마지막 확인 문구에 동의해 주세요." };
  if (!sameName(body.signature, reporterName)) {
    return { ok: false, error: "서명란에 신고인 성명을 똑같이 적어주세요." };
  }
  if (!body.requests.includes("other")) body.requestOther = "";
  return { ok: true, body };
}

// ── 서식 순서대로 펼치기(대시보드·메일·인쇄) ────────────────────────────

export interface DocRow {
  label: string;
  value: string;
}
export interface DocBlock {
  heading?: string;
  rows: DocRow[];
}
export interface DocSection {
  title: string;
  note?: string;
  blocks: DocBlock[];
  /** 적은 것이 없을 때 보여줄 말 */
  empty?: string;
}
export interface DocPart {
  title: string;
  sections: DocSection[];
}

const labelOf = (items: readonly { value: string; label: string }[], value: string) =>
  items.find((i) => i.value === value)?.label ?? value;

export function harassmentDocument(
  body: HarassmentBody,
  meta: { name: string; department: string; contact: string; submittedAt: string },
  attachmentNames: string[] = [],
): DocPart[] {
  const requests = body.requests.map((r) =>
    r === "other" && body.requestOther ? `기타: ${body.requestOther}` : labelOf(REQUEST_TYPES, r),
  );
  const attachmentRows: DocRow[] = [
    ...body.evidenceItems.map((e, i) => ({
      label: `자료 ${i + 1}`,
      value: [e.name, e.date && `(${e.date})`, e.proves && `— ${e.proves}`].filter(Boolean).join(" "),
    })),
    ...attachmentNames.map((n, i) => ({ label: `첨부 사진 ${i + 1}`, value: n })),
  ];
  const signedOn = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(meta.submittedAt));

  return [
    {
      title: "직장 내 괴롭힘 신고서",
      sections: [
        {
          title: "1. 신고인 정보",
          blocks: [
            {
              rows: [
                { label: "성명", value: meta.name },
                { label: "소속/부서", value: meta.department },
                { label: "직위·직급", value: body.position },
                { label: "연락처", value: meta.contact },
              ],
            },
          ],
        },
        {
          title: "2. 피신고인 정보",
          blocks: [
            {
              rows: [
                { label: "성명", value: body.accused.name },
                { label: "소속/부서", value: body.accused.department },
                { label: "직위·직급", value: body.accused.position },
                { label: "신고인과의 관계", value: body.accused.relation },
              ],
            },
          ],
        },
        {
          title: "3. 신고 내용",
          blocks: [
            {
              rows: [
                { label: "발생 기간", value: body.report.period },
                { label: "발생 장소", value: body.report.place },
                { label: "주요 행위 또는 발언", value: body.report.acts },
                { label: "신고 경위", value: body.report.background },
                { label: "반복 여부 및 횟수", value: body.report.repeat },
              ],
            },
          ],
        },
        {
          title: "4. 목격자 및 참고인",
          empty: "적은 사람이 없습니다.",
          blocks: body.witnesses.map((w, i) => ({
            heading: `참고인 ${i + 1}`,
            rows: [
              { label: "성명", value: w.name },
              { label: "소속/직위", value: w.affiliation },
              { label: "확인 가능한 내용", value: w.knows },
            ],
          })),
        },
        {
          title: "5. 증거자료",
          empty: "선택한 자료가 없습니다.",
          blocks: body.evidenceTypes.length
            ? [
                {
                  rows: [
                    {
                      label: "보유 자료",
                      value: body.evidenceTypes.map((t) => labelOf(EVIDENCE_TYPES, t)).join(", "),
                    },
                  ],
                },
              ]
            : [],
        },
        {
          title: "6. 피해 내용",
          blocks: [
            {
              rows: [
                { label: "업무·근무환경 등에 발생한 피해", value: body.damage.impact },
                { label: "현재까지 지속되고 있는 상황", value: body.damage.ongoing },
              ],
            },
          ],
        },
        {
          title: "7. 신고인 요청사항",
          empty: "선택한 요청사항이 없습니다.",
          blocks: requests.length ? [{ rows: [{ label: "요청사항", value: requests.join("\n") }] }] : [],
        },
        {
          title: "8. 첨부자료 목록",
          empty: "첨부한 자료가 없습니다.",
          blocks: attachmentRows.length ? [{ rows: attachmentRows }] : [],
        },
        {
          title: "9. 신고일 및 신고인 서명",
          blocks: [
            {
              rows: [
                { label: "신고일", value: signedOn },
                { label: "신고인 서명", value: `${body.signature} (온라인 제출, 성명 입력으로 서명)` },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "피해사실 상세기술서",
      sections: [
        ...(body.incidents.length
          ? body.incidents.map((inc, i) => ({
              title: `사건 ${i + 1}`,
              blocks: [
                {
                  rows: [
                    { label: "2. 발생 일자 및 시간", value: inc.when },
                    { label: "3. 발생 장소", value: inc.place },
                    { label: "4. 당시 상황", value: inc.context },
                    { label: "5. 구체적인 피해사실", value: inc.facts },
                    { label: "6. 당시 본인의 대응", value: inc.response },
                    { label: "7. 사건 이후 상황", value: inc.after },
                  ],
                },
              ],
            }))
          : [{ title: "사건별 기술(2~7항)", empty: "사건별로 적은 내용이 없습니다.", blocks: [] }]),
        // 8~10항은 화면에서 신고서 6·4·8항으로 한 번만 받은 내용을 상세기술서 항목 이름으로 다시 적습니다.
        {
          title: "8. 피해 내용",
          note: "신고서 6항에 적은 내용",
          blocks: [
            {
              rows: [
                { label: "업무 수행·근무환경에 미친 영향 및 기타 피해사항", value: body.damage.impact },
                { label: "현재까지 지속되고 있는 상황", value: body.damage.ongoing },
              ],
            },
          ],
        },
        {
          title: "9. 목격자 및 참고인",
          note: "신고서 4항에 적은 내용",
          empty: "적은 사람이 없습니다.",
          blocks: body.witnesses.map((w, i) => ({
            heading: `참고인 ${i + 1}`,
            rows: [
              { label: "성명", value: w.name },
              { label: "소속/직위", value: w.affiliation },
              { label: "해당 인원이 확인할 수 있는 내용", value: w.knows },
            ],
          })),
        },
        {
          title: "10. 관련 증거자료",
          note: "신고서 8항에 적은 내용",
          empty: "적은 자료가 없습니다.",
          blocks: body.evidenceItems.map((e, i) => ({
            heading: `자료 ${i + 1}`,
            rows: [
              { label: "자료명", value: e.name },
              { label: "자료의 일자", value: e.date },
              { label: "해당 자료로 확인할 수 있는 내용", value: e.proves },
            ],
          })),
        },
        {
          title: "11. 기타 조사 시 참고가 필요한 사항",
          blocks: [{ rows: [{ label: "내용", value: body.other }] }],
        },
        {
          title: "확인",
          blocks: [{ rows: [{ label: "신고인 확인", value: `${PLEDGE_TEXT}\n— ${body.signature}` }] }],
        },
      ],
    },
  ];
}

/** 메일용: 서식을 제목·본문 쌍으로 폅니다. */
export function harassmentMailSections(parts: DocPart[]): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const part of parts) {
    for (const section of part.sections) {
      const label = `${part.title} · ${section.title}`;
      const lines: string[] = [];
      if (section.note) lines.push(section.note);
      for (const block of section.blocks) {
        if (block.heading) lines.push(`[${block.heading}]`);
        for (const row of block.rows) lines.push(`${row.label}: ${row.value || "—"}`);
      }
      if (!lines.length && section.empty) lines.push(section.empty);
      out.push({ label, value: lines.join("\n") });
    }
  }
  return out;
}
