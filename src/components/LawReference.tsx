import { LAW_NOTES, type ConfidentialKind } from "@/lib/confidential";

/** 탭 머리말 아래의 관련 법령 몇 줄. */
export default function LawReference({ kind }: { kind: ConfidentialKind }) {
  return (
    <section className="card px-4 py-3.5 sm:px-5">
      <h2 className="text-xs font-bold text-brand">관련 법령</h2>
      <ul className="mt-2 space-y-1.5">
        {LAW_NOTES[kind].map((note) => (
          <li key={note.text} className="flex gap-2 text-[13px] leading-relaxed text-ink/80">
            <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
            <span className="text-pretty">
              {note.text} <span className="whitespace-nowrap text-xs text-muted">{note.source}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
