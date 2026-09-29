import { ConfidentialThanks } from "@/components/ConfidentialPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "개인 고충 접수" };

export default function Page() {
  return <ConfidentialThanks kind="grievance" />;
}
