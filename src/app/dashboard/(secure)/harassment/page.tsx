import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import ReportsList from "@/components/ReportsList";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await readSession();
  if (!session) redirect("/dashboard/login");
  return <ReportsList kind="harassment" />;
}
