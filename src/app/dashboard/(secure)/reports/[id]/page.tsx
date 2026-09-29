import { notFound, redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { loadReport } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** 예전 상세 주소. 해당 건이 속한 탭의 상세로 넘깁니다. */
export default async function Page({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");
  if (!/^[0-9a-fA-F-]{36}$/.test(params.id)) notFound();
  const r = await loadReport(params.id);
  if (!r) notFound();
  redirect(`/dashboard/${r.kind}/${r.id}`);
}
