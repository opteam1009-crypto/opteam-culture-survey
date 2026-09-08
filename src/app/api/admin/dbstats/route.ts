import { NextResponse } from "next/server";
import { dbStats } from "@/lib/db";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** 진단 전용. 이 인스턴스가 DB 에 몇 번 다녀왔는지 봅니다. */
export async function GET() {
  let session = null;
  try {
    session = await readSession();
  } catch {
    session = null;
  }
  if (!session) return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  return NextResponse.json({ ...dbStats });
}
