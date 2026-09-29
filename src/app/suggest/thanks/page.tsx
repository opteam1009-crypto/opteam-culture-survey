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
          <h1 className="mt-5 text-xl font-bold">제안을 잘 받았습니다</h1>
          <p className="mt-2 text-sm text-white/75">소중한 의견 감사합니다.</p>
        </div>

        <div className="px-8 py-7 text-left">
          <p className="text-sm leading-relaxed text-muted">
            기획운영팀이 <b className="text-ink">매월 모아</b> 대표님께 전달한 뒤,
            검토 결과를 직접 알려드립니다.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            채택된 제안에는 포상이 있습니다.
          </p>
          <p className="mt-6 text-xs text-muted">
            또 떠오르는 아이디어가 있으면 언제든 편하게 보내주세요.
          </p>
        </div>
      </div>

      <Link href="/suggest" className="mt-5 text-xs text-muted transition hover:text-ink">
        제안 하나 더 쓰기
      </Link>
    </main>
  );
}
