"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConfidentialField, ConfidentialKind } from "@/lib/confidential";
import type { PreparedImage } from "@/lib/prepareImage";
import AttachmentPicker from "./AttachmentPicker";

interface Props {
  kind: ConfidentialKind;
  path: string;
  fields: ConfidentialField[];
  departments: string[];
}

/** 전담 창구 접수 폼. */
export default function ConfidentialForm({ kind, path, fields, departments }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [contact, setContact] = useState("");
  const [body, setBody] = useState<Record<string, string>>({});
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    name.trim() &&
    department &&
    contact.trim() &&
    fields.every((f) => !f.required || (body[f.code] ?? "").trim());

  async function submit() {
    if (!ready || busy || preparing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/confidential/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          department,
          contact,
          ...body,
          attachments: images.map(({ name: fileName, data }) => ({ name: fileName, data })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "접수하지 못했습니다.");
        setBusy(false);
        return;
      }
      router.push(`${path}/thanks`);
    } catch {
      setError("네트워크 오류로 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <section className="card p-5 sm:p-7">
        <h2 className="form-title">접수하시는 분</h2>
        <p className="form-desc mt-1 text-pretty">
          처리 결과 안내와 추가 확인이 필요할 때 연락드리기 위해 받고 있습니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="form-label">성함</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              className="field"
              autoComplete="name"
            />
          </label>
          <label className="text-sm">
            <span className="form-label">소속</span>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="field"
            >
              <option value="">선택해 주세요</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="form-label">
              연락받으실 곳 <span className="font-normal">— 이메일 또는 휴대폰</span>
            </span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value.slice(0, 80))}
              className="field"
              placeholder="예) hong@company.com 또는 010-0000-0000"
            />
          </label>
        </div>
      </section>

      {fields.map((field) => (
        <section key={field.code} className="card p-5 sm:p-7">
          <h2 className="form-title">
            {field.label}
            {!field.required && <span className="ml-1.5 text-[13px] font-normal text-muted">선택</span>}
          </h2>
          <p className="form-desc mt-1 text-pretty">{field.prompt}</p>
          <textarea
            value={body[field.code] ?? ""}
            onChange={(e) =>
              setBody((prev) => ({ ...prev, [field.code]: e.target.value.slice(0, 3000) }))
            }
            rows={field.rows ?? 4}
            className="field mt-3 resize-y leading-relaxed"
            placeholder={field.placeholder}
          />
        </section>
      ))}

      <AttachmentPicker
        title="증빙 자료"
        hint="사진이나 메신저 대화 캡처 등이 있으면 함께 올려주세요. 최대 5장까지 올릴 수 있습니다."
        images={images}
        onChange={setImages}
        onBusyChange={setPreparing}
      />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="form-desc text-pretty">
          적어주신 내용은 조사와 처리에 필요한 범위에서만 다룹니다.
        </p>
        <button type="submit" className="btn-primary px-6 py-2.5 text-sm" disabled={!ready || busy || preparing}>
          {busy ? "보내는 중…" : preparing ? "사진 담는 중…" : "접수하기"}
        </button>
      </div>
    </form>
  );
}
