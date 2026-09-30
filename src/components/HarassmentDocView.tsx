import type { DocPart } from "@/lib/harassmentForm";

/**
 * 괴롭힘 신고서·피해사실 상세기술서를 서식 순서대로 보여줍니다(대시보드 상세·인쇄).
 * 인쇄(PDF 저장) 때 항목 중간에서 페이지가 끊기지 않도록 항목마다 나눔을 막습니다.
 */
export default function HarassmentDocView({ parts }: { parts: DocPart[] }) {
  return (
    <div className="space-y-8">
      {parts.map((part) => (
        <section key={part.title}>
          <h2 className="border-b-2 border-ink pb-2 text-base font-bold text-ink">{part.title}</h2>
          <div className="divide-y divide-line">
            {part.sections.map((section) => (
              <div key={section.title} className="break-inside-avoid py-4">
                <h3 className="text-[13px] font-bold text-brand">{section.title}</h3>
                {section.note && <p className="mt-1 text-xs text-muted">{section.note}</p>}
                {section.blocks.length === 0 && section.empty && (
                  <p className="mt-1.5 text-sm text-muted">{section.empty}</p>
                )}
                {section.blocks.map((block, i) => (
                  <div key={i} className={i > 0 || block.heading ? "mt-3" : "mt-2"}>
                    {block.heading && <p className="mb-1.5 text-xs font-bold text-ink">{block.heading}</p>}
                    <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-[11rem_minmax(0,1fr)]">
                      {block.rows.map((row) => (
                        <div key={row.label} className="contents">
                          <dt className="pt-0.5 text-xs font-semibold text-muted">{row.label}</dt>
                          <dd className="mb-1 whitespace-pre-wrap break-words text-[14px] leading-[1.75] text-ink/90 sm:mb-0">
                            {row.value || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
