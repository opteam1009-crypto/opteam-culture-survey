import Link from "next/link";
import { loadActiveDepartments } from "@/lib/queries";
import { CONFIDENTIAL_CHANNELS, type ConfidentialKind } from "@/lib/confidential";
import ConfidentialForm from "./ConfidentialForm";
import HarassmentForm from "./HarassmentForm";

/**
 * 전담 창구 접수 화면(고충·괴롭힘 공용).
 *
 * 제안 화면보다 차분하게 둡니다. 밝은 배너는 "아이디어를 내 주세요" 에는
 * 어울리지만, 어려운 이야기를 꺼내는 자리에는 들뜬 느낌을 줍니다.
 */
export default async function ConfidentialPage({ kind }: { kind: ConfidentialKind }) {
  const channel = CONFIDENTIAL_CHANNELS[kind];
  const departments = (await loadActiveDepartments()).map((d) => d.name);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-5 sm:py-12">
      <Link href="/" className="text-xs text-muted transition hover:text-ink">
        ← 제안 화면으로
      </Link>

      <header className="card mt-3 p-6 sm:p-8">
        <p className="text-xs font-semibold text-brand">{channel.receiver}</p>
        <h1 className="mt-1.5 text-balance text-2xl font-bold">{channel.title}</h1>
        <p className="mt-3.5 text-pretty text-[15px] leading-[1.8] text-ink/75">{channel.intro}</p>
      </header>

      <div className="mt-5">
        {kind === "harassment" ? (
          <HarassmentForm path={channel.path} departments={departments} />
        ) : (
          <ConfidentialForm
            kind={kind}
            path={channel.path}
            fields={channel.fields}
            departments={departments}
          />
        )}
      </div>
    </main>
  );
}

/** 접수 완료 화면(고충·괴롭힘 공용). */
export function ConfidentialThanks({ kind }: { kind: ConfidentialKind }) {
  const channel = CONFIDENTIAL_CHANNELS[kind];
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 py-16">
      <div className="card w-full p-8">
        <p className="text-xs font-semibold text-brand">{channel.receiver}</p>
        <h1 className="mt-1.5 text-xl font-bold">접수가 완료되었습니다</h1>
        <p className="mt-4 text-pretty text-sm leading-[1.8] text-ink/75">{channel.after}</p>
        <p className="mt-6 text-xs text-muted">이 창은 닫으셔도 됩니다.</p>
      </div>
    </main>
  );
}
