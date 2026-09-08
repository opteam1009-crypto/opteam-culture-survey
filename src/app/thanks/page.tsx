import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ThanksPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period ?? "";
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-16">
      <div className="card w-full overflow-hidden text-center">
        <div className="bg-gradient-to-br from-brand via-[#24589f] to-accent px-8 py-10 text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl backdrop-blur">
            ✓
          </div>
          <h1 className="mt-5 text-xl font-bold">제출이 완료되었습니다</h1>
          <p className="mt-2 text-sm text-white/75">
            {period ? `${period} 진단에 참여해 주셔서 감사합니다.` : "참여해 주셔서 감사합니다."}
          </p>
        </div>

        <div className="px-8 py-7">
          <p className="text-sm leading-relaxed text-muted">
            남겨주신 의견은 <b className="text-ink">선택하신 열람 범위 안에서만</b> 확인되며,
            인사평가 등 다른 목적으로는 사용되지 않습니다.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            적어주신 희망 일시를 참고해 <b className="text-ink">1:1 면담 일정</b>을 별도로
            안내드릴 예정입니다.
          </p>
          <p className="mt-6 text-xs text-muted">이 창은 닫으셔도 됩니다.</p>
        </div>
      </div>

      <Link href="/" className="mt-5 text-xs text-muted transition hover:text-ink">
        처음으로
      </Link>
    </main>
  );
}
