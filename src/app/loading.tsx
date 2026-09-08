export default function SurveyLoading() {
  return (
    <main className="mx-auto max-w-3xl animate-pulse px-5 pb-10 pt-8 sm:pt-12">
      <div className="card mb-4 overflow-hidden">
        <div className="h-44 bg-gradient-to-br from-brand via-[#24589f] to-accent opacity-70" />
        <div className="space-y-3 px-7 py-5">
          <div className="h-3 rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200/70" />
        </div>
      </div>
      <div className="card p-6">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="h-11 rounded-xl bg-gray-100" />
          <div className="h-11 rounded-xl bg-gray-100" />
        </div>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
          <div className="h-20 rounded-xl bg-gray-100" />
          <div className="h-20 rounded-xl bg-gray-100" />
          <div className="h-20 rounded-xl bg-gray-100" />
        </div>
      </div>
    </main>
  );
}
