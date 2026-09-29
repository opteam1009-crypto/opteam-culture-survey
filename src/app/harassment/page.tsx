import ConfidentialPage from "@/components/ConfidentialPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "직장 내 괴롭힘 신고" };

export default function Page() {
  return <ConfidentialPage kind="harassment" />;
}
