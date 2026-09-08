import { redirect } from "next/navigation";
import { loginConfigProblem, readSession } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let session = null;
  try {
    session = await readSession();
  } catch {
    // SESSION_SECRET 미설정 등으로 세션을 읽을 수 없으면 로그인 화면을 그대로 보여줍니다.
  }
  if (session) redirect("/dashboard");

  const configProblem = loginConfigProblem();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <div className="card p-7">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">경영진 전용</p>
        <h1 className="mt-2 text-xl font-bold">사내 진단 대시보드</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          대표이사·인사책임자 계정의 비밀번호를 입력해 주세요. 계정에 따라 열람할 수 있는 응답
          범위가 다릅니다.
        </p>
        {configProblem ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900">
            {configProblem}
          </p>
        ) : (
          <LoginForm />
        )}
      </div>
      <p className="mt-5 text-center text-xs text-muted">
        비밀번호는 환경변수로 관리되며 응답자에게는 공개되지 않습니다.
      </p>
    </main>
  );
}
