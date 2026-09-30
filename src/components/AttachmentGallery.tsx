import type { AttachmentMeta } from "@/lib/attachments";

/**
 * 상세 화면의 첨부 사진. 누르면 새 탭에서 원본 크기로 열립니다.
 * 사진 주소는 로그인한 대시보드에서만 열리는 경로입니다.
 * 인쇄(PDF 저장) 때는 잘리지 않도록 사진 전체를 보여줍니다.
 */
export default function AttachmentGallery({
  title,
  items,
}: {
  title: string;
  items: AttachmentMeta[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-5 border-t border-line pt-5">
      <h2 className="text-xs font-bold text-brand">
        {title} <span className="ml-1 font-semibold text-muted">{items.length}장</span>
      </h2>
      <ul className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 print:grid-cols-2">
        {items.map((a) => {
          const src = `/api/admin/attachments/${a.id}`;
          return (
            <li key={a.id} className="min-w-0 break-inside-avoid">
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-line bg-gray-50 transition hover:border-brand/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- 로그인이 필요한 경로라 이미지 최적화를 거치지 않습니다 */}
                <img
                  src={src}
                  alt={a.filename}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover print:aspect-auto print:object-contain"
                />
              </a>
              <p className="mt-1 truncate text-[11px] text-muted">{a.filename}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
