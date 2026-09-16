import { SECTIONS } from "./questions";
import { VISIBILITY_LABEL } from "./mail";
import { formatPeriod } from "./period";
import type { InterviewRequest, ResponseRow } from "./queries";

/**
 * 구글 시트 연동.
 *
 * 시트에 직접 쓰지 않고, 시트에 붙여둔 Apps Script 웹 앱에 JSON 을 보냅니다.
 * (붙여넣을 코드: scripts/google-sheet-apps-script.gs)
 *
 * 구글 클라우드 프로젝트도 서비스 계정 키도 필요 없는 방식이라 설정이 가볍고,
 * 우리 쪽에 구글 자격증명을 두지 않아도 됩니다. 대신 URL 을 아는 사람이면
 * 누구나 부를 수 있으므로 공유 비밀(SHEETS_WEBHOOK_SECRET)로 막습니다.
 *
 * 값을 "어느 칸에" 넣을지는 우리가 정하지 않습니다. 이미 쓰고 있는 시트가
 * 있으니 열 순서를 우리가 정하면 남의 양식을 깨뜨립니다. 그래서 아래처럼
 * 한글 항목명을 키로 하는 객체를 보내고, 시트의 첫 행(헤더)과 이름이 맞는
 * 칸만 스크립트가 채웁니다. 헤더에 없는 항목은 그냥 버려지고, 우리가 보내지
 * 않는 칸(비고·담당자 같은 수기 입력)은 건드리지 않습니다.
 */

/** 항목명 → 값. 시트 헤더와 이름이 맞는 칸만 채워집니다. */
export type SheetRow = Record<string, string>;

export interface SheetPushResult {
  status: "sent" | "skipped" | "failed";
  updated: number;
  appended: number;
  message: string;
}

function realValue(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  // Vercel 이 .env.example 에서 만들어낸 예시값은 미설정으로 봅니다(auth.ts 와 같은 기준).
  if (value.startsWith("바꾸세요") || value.startsWith("CHANGE_ME")) return "";
  return value;
}

export function sheetsConfigured(): boolean {
  return realValue(process.env.SHEETS_WEBHOOK_URL).startsWith("https://");
}

/** 한국 시간 'YYYY-MM-DD HH:MM'. 시트가 날짜로 인식하는 형식입니다. */
function seoulStamp(value: string | Date | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}`;
}

/**
 * 면담 희망 일시는 'YYYY-MM-DD HH:MM' 로 저장되지만, 날짜 선택을 넣기 전의
 * 옛 응답은 "화요일 오후" 같은 자유 입력입니다. 형식이 맞으면 그대로,
 * 아니면 적어낸 원문을 그대로 넘깁니다.
 */
function slotValue(raw: string): string {
  const value = (raw ?? "").trim();
  return value;
}

const RISK_LABEL = ["정상", "주의", "확인 필요"];

/**
 * 응답 목록과 면담 일정을 시트 한 행씩으로 만듭니다.
 *
 * 면담을 신청하지 않은 사람도 설문 제출일은 있으므로 응답을 기준으로 돌고,
 * 면담 정보는 있으면 얹습니다.
 */
export function buildSheetRows(
  responses: ResponseRow[],
  interviews: InterviewRequest[],
): SheetRow[] {
  const byResponse = new Map(interviews.map((i) => [i.responseId, i]));

  return responses.map((row) => {
    const interview = byResponse.get(row.id);
    const sheet: SheetRow = {
      // 회차코드는 사람이 읽는 값이 아니라 같은 사람을 다시 찾을 때 쓰는 열쇠입니다.
      회차코드: row.period,
      회차: formatPeriod(row.period),
      이름: row.respondent_name,
      부서: row.department_name,
      열람범위: VISIBILITY_LABEL[row.visibility] ?? row.visibility,
      제출일시: seoulStamp(row.submitted_at),
      제출일자: seoulStamp(row.submitted_at).slice(0, 10),
      종합점수: row.overall_score === null ? "" : String(row.overall_score),
      위험도: RISK_LABEL[Number(row.risk_level ?? 0)] ?? "",
    };

    for (const section of SECTIONS) {
      const score = row.section_scores?.[section.code];
      if (score === undefined || score === null) continue;
      sheet[`${section.label} 점수`] = String(score);
    }

    if (interview) {
      sheet.면담상태 =
        interview.status === "confirmed"
          ? "확정"
          : interview.status === "cancelled"
            ? "취소됨"
            : "미확정";
      // 확정 전에는 비워 둡니다. 희망 일시를 여기에 적으면 잡힌 일정처럼 보입니다.
      sheet.면담일정 = interview.status === "confirmed" ? slotValue(interview.scheduledAt ?? "") : "";
      sheet.면담희망1 = slotValue(interview.first);
      sheet.면담희망2 = slotValue(interview.second);
      sheet.면담주제 = interview.topic ?? "";
    } else {
      sheet.면담상태 = "신청 없음";
      sheet.면담일정 = "";
      sheet.면담희망1 = "";
      sheet.면담희망2 = "";
      sheet.면담주제 = "";
    }

    return sheet;
  });
}

/** 스크립트에 보내고 결과를 받습니다. 실패해도 예외를 던지지 않습니다. */
export async function pushToSheet(rows: SheetRow[]): Promise<SheetPushResult> {
  const url = realValue(process.env.SHEETS_WEBHOOK_URL);
  if (!url.startsWith("https://")) {
    return {
      status: "skipped",
      updated: 0,
      appended: 0,
      message:
        "시트 연동이 설정되지 않았습니다. Vercel 환경변수에 SHEETS_WEBHOOK_URL 을 등록해 주세요.",
    };
  }
  if (rows.length === 0) {
    return { status: "skipped", updated: 0, appended: 0, message: "보낼 응답이 없습니다." };
  }

  // Apps Script 가 느릴 때 요청이 영영 매달려 있지 않도록 끊습니다.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 20_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      // Apps Script 는 preflight 가 필요한 Content-Type 을 싫어합니다.
      // text/plain 으로 보내고 스크립트에서 JSON.parse 합니다.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: realValue(process.env.SHEETS_WEBHOOK_SECRET), rows }),
      signal: abort.signal,
      // 웹 앱은 script.googleusercontent.com 으로 한 번 넘깁니다.
      redirect: "follow",
      cache: "no-store",
    });

    const text = await res.text();
    let parsed: { ok?: boolean; updated?: number; appended?: number; error?: string } = {};
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      // 스크립트가 아니라 구글 로그인 페이지가 돌아온 경우가 대부분입니다.
      return {
        status: "failed",
        updated: 0,
        appended: 0,
        message:
          "시트에서 예상 밖의 응답이 왔습니다. 웹 앱 배포의 액세스 권한을 「모든 사용자」로 두었는지 확인해 주세요.",
      };
    }

    if (!res.ok || parsed.ok !== true) {
      return {
        status: "failed",
        updated: 0,
        appended: 0,
        message: parsed.error ?? `시트가 오류를 돌려주었습니다. (HTTP ${res.status})`,
      };
    }

    return {
      status: "sent",
      updated: Number(parsed.updated ?? 0),
      appended: Number(parsed.appended ?? 0),
      message: "",
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[sheets] push failed", err);
    return {
      status: "failed",
      updated: 0,
      appended: 0,
      message: aborted
        ? "시트가 20초 안에 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요."
        : "시트에 연결하지 못했습니다. SHEETS_WEBHOOK_URL 을 확인해 주세요.",
    };
  } finally {
    clearTimeout(timer);
  }
}
