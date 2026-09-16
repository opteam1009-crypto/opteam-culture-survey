import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { loadInterviewRequests, loadVisibleResponses } from "@/lib/queries";
import { buildSheetRows, pushToSheet, sheetsConfigured } from "@/lib/sheets";

export const dynamic = "force-dynamic";

/**
 * 「시트로 보내기」 버튼이 부르는 곳.
 *
 * 화면에서 보고 있는 회차·부서 조건 그대로를 시트에 밀어 넣습니다. 보이는 것과
 * 보내는 것이 다르면 무엇이 올라갔는지 알 수 없게 됩니다.
 *
 * 같은 사람을 여러 번 보내도 행이 늘지 않습니다. 회차+이름이 같은 행이 있으면
 * 덮어쓰고, 없을 때만 새 행을 답니다(판단은 Apps Script 쪽에서 합니다).
 */
export async function POST(request: Request) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  if (!sheetsConfigured()) {
    return NextResponse.json(
      {
        error:
          "시트 연동이 아직 설정되지 않았습니다. Vercel 환경변수에 SHEETS_WEBHOOK_URL 을 등록한 뒤 다시 시도해 주세요.",
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    period?: unknown;
    dept?: unknown;
  };
  const period = typeof body.period === "string" ? body.period : "";
  const dept = typeof body.dept === "string" ? body.dept : "";

  try {
    const all = await loadVisibleResponses(session.role);
    const responses = all.filter(
      (r) => (!period || r.period === period) && (!dept || r.department_name === dept),
    );
    if (responses.length === 0) {
      return NextResponse.json({ error: "조건에 맞는 응답이 없습니다." }, { status: 400 });
    }

    const interviews = await loadInterviewRequests(session.role, period || undefined);
    const result = await pushToSheet(buildSheetRows(responses, interviews));

    if (result.status !== "sent") {
      return NextResponse.json({ error: result.message }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      appended: result.appended,
      total: responses.length,
    });
  } catch (err) {
    console.error("[sheets-sync] failed", err);
    return NextResponse.json({ error: "보내는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
