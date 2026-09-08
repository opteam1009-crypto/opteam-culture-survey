/**
 * 페이지 이동 즉시 보여줄 뼈대. 이게 없으면 서버 렌더가 끝날 때까지 이전 화면이
 * 그대로 멈춰 있어 실제보다 훨씬 느리게 느껴집니다.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-52 rounded-lg bg-gray-200" />
          <div className="h-3.5 w-72 rounded bg-gray-200/70" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-gray-200/70" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="mt-3 h-8 w-24 rounded-lg bg-gray-200" />
            <div className="mt-3 h-3 w-20 rounded bg-gray-200/70" />
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="h-4 w-64 rounded bg-gray-200" />
        <div className="mt-2 h-3 w-96 max-w-full rounded bg-gray-200/70" />
        <div className="mt-6 h-56 rounded-xl bg-gray-100" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="card p-6">
            <div className="h-4 w-36 rounded bg-gray-200" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <div className="h-3 w-40 rounded bg-gray-200/80" />
                  <div className="mt-2 h-2.5 rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
