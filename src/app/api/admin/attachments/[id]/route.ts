import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { loadAttachmentFile } from "@/lib/attachments";

export const dynamic = "force-dynamic";

/**
 * 첨부 사진 내려받기. 대시보드에 로그인한 요청에만 사진을 돌려줍니다.
 * 괴롭힘 증빙처럼 민감한 사진이 있어 브라우저·중간 캐시에 남기지 않습니다.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) {
    return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const file = await loadAttachmentFile(params.id);
    if (!file) return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(file.data.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      },
    });
  } catch (err) {
    console.error("[attachments] failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "사진을 불러오지 못했습니다." }, { status: 500 });
  }
}
