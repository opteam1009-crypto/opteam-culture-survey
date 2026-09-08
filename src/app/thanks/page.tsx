import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ThanksPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period ?? "";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <div className="card w-full px-7 py-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brandSoft text-2xl">
          ✓
        </div>
        <h1 className="mt-5 text-xl font-bold">제출이 완료되었습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {period ? `${period} 진단에 응답해 주셔서 감사합니다.` : "응답해 주셔서 감사합니다."}
          <br />
          솔직하게 남겨주신 의견은 지정하신 열람 범위 안에서만 확인됩니다.
        </p>
        <Link href="/" className="btn-ghost mt-7">
          처음으로
        </Link>
      </div>
    </main>
  );
}
