import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import ReportDetail from "@/components/ReportDetail";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");
  return <ReportDetail id={params.id} kind="harassment" />;
}
