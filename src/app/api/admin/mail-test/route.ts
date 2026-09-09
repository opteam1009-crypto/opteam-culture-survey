import { NextResponse } from "next/server";
import { ROLE_LABEL, readSession } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { sendTestMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
// SMTP 연결이 느릴 수 있어 기본 제한(10초)보다 여유를 둡니다.
export const maxDuration = 30;

export async function POST() {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });

  await ensureSchema();
  const result = await sendTestMail(ROLE_LABEL[session.role]);
  return NextResponse.json(result);
}
