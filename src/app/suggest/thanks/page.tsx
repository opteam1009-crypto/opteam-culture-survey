import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SuggestThanksPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-16">
      <div className="card w-full overflow-hidden text-center">
        <div className="bg-gradient-to-br from-brand via-[#24589f] to-accent px-8 py-10 text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl backdrop-blur">
            ✓
          </div>
          <h1 className="mt-5 text-xl font-bold">제안이 접수되었습니다</h1>
          <p className="mt-2 text-sm text-white/75">소중한 의견 감사합니다.</p>
        </div>

        <div className="px-8 py-7 text-left">
          <p className="text-pretty text-sm leading-relaxed text-muted">
            접수된 내용은 검토 후 채택된 의견에 한해 개별 연락드리겠습니다.
            채택된 제안에는 포상이 있습니다.
          </p>
          <p className="mt-6 text-xs text-muted">추가 제안은 언제든 제출하실 수 있습니다.</p>
        </div>
      </div>

      <Link href="/" className="mt-5 text-xs text-muted transition hover:text-ink">
        새 제안 작성
      </Link>
    </main>
  );
}
