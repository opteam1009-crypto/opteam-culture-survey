"use client";

import { useRef, useState } from "react";
import { MAX_ATTACHMENTS } from "@/lib/attachmentRules";
import { prepareImage, type PreparedImage } from "@/lib/prepareImage";

/**
 * 사진 첨부 칸(제안·고충·신고 접수 화면 공용). 고르는 즉시 줄여서 미리보기로 보여주고,
 * 줄이는 동안에는 onBusyChange 로 알려 접수 버튼을 잠시 막습니다.
 */
export default function AttachmentPicker({
  title,
  hint,
  images,
  onChange,
  onBusyChange,
  embedded = false,
}: {
  title: string;
  hint: string;
  images: PreparedImage[];
  onChange: (next: PreparedImage[]) => void;
  onBusyChange?: (busy: boolean) => void;
  /** 다른 카드 안에 넣을 때(괴롭힘 신고서 8항). 카드 테두리 없이 구분선만 둡니다. */
  embedded?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setWorking(value: boolean) {
    setBusy(value);
    onBusyChange?.(value);
  }

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    const room = MAX_ATTACHMENTS - images.length;
    const picked = Array.from(list).slice(0, room);
    let problem: string | null =
      list.length > room ? `사진은 ${MAX_ATTACHMENTS}장까지 올릴 수 있습니다.` : null;

    setWorking(true);
    const next = [...images];
    for (const file of picked) {
      try {
        next.push(await prepareImage(file));
      } catch {
        problem = "열 수 없는 파일은 빼고 담았습니다. JPG나 PNG 사진인지 확인해 주세요.";
      }
    }
    onChange(next);
    setError(problem);
    setWorking(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(key: string) {
    const target = images.find((img) => img.key === key);
    if (target) URL.revokeObjectURL(target.preview);
    onChange(images.filter((img) => img.key !== key));
    setError(null);
  }

  return (
    <section className={embedded ? "mt-5 border-t border-line pt-5" : "card p-5 sm:p-7"}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={embedded ? "text-sm font-bold" : "text-[15px] font-bold"}>
          {title}
          <span className="ml-1.5 text-xs font-normal text-muted">선택</span>
        </h2>
        <span className="text-xs tabular-nums text-muted">
          {images.length} / {MAX_ATTACHMENTS}
        </span>
      </div>
      <p className="mt-1 text-pretty text-[13px] leading-relaxed text-muted">{hint}</p>

      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {images.map((img) => (
          <div
            key={img.key}
            className="relative aspect-square overflow-hidden rounded-xl border border-line bg-gray-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 미리보기 주소 */}
            <img src={img.preview} alt={img.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(img.key)}
              aria-label={`${img.name} 빼기`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        ))}

        {images.length < MAX_ATTACHMENTS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-white text-muted transition hover:border-brand/50 hover:bg-brandTint hover:text-brand disabled:opacity-60"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M10 4v12M4 10h12" />
            </svg>
            <span className="text-xs font-semibold">{busy ? "담는 중…" : "사진 추가"}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void add(e.target.files)}
      />
      {error && <p className="mt-2.5 text-xs text-red-600">{error}</p>}
    </section>
  );
}
