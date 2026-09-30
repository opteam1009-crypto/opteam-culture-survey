"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  EVIDENCE_TYPES,
  MAX_EVIDENCE_ITEMS,
  MAX_INCIDENTS,
  MAX_LONG,
  MAX_SHORT,
  MAX_WITNESSES,
  PLEDGE_TEXT,
  REQUEST_TYPES,
  emptyEvidenceItem,
  emptyIncident,
  emptyWitness,
  sameName,
  type EvidenceItem,
  type Incident,
  type Witness,
} from "@/lib/harassmentForm";
import type { PreparedImage } from "@/lib/prepareImage";
import AttachmentPicker from "./AttachmentPicker";

/**
 * 직장 내 괴롭힘 신고 접수(고용노동부 신고서·상세기술서 구성).
 *
 * 칸이 많아도 부담 없이 쓰도록 필수는 최소로 둡니다(신고인 성명·소속·연락처,
 * 피신고인 성명, 주요 행위 또는 발언, 마지막 확인과 서명). 나머지는 아는 만큼만
 * 적으면 됩니다. 두 서식에 겹치는 항목은 신고서 쪽 한 곳에서만 받습니다.
 */
export default function HarassmentForm({
  path,
  departments,
}: {
  path: string;
  departments: string[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [contact, setContact] = useState("");
  const [accused, setAccused] = useState({ name: "", department: "", position: "", relation: "" });
  const [report, setReport] = useState({ period: "", place: "", acts: "", background: "", repeat: "" });
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [evidenceTypes, setEvidenceTypes] = useState<string[]>([]);
  const [damage, setDamage] = useState({ impact: "", ongoing: "" });
  const [requests, setRequests] = useState<string[]>([]);
  const [requestOther, setRequestOther] = useState("");
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [images, setImages] = useState<PreparedImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([emptyIncident()]);
  const [other, setOther] = useState("");
  const [pledge, setPledge] = useState(false);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = [
    !name.trim() && "신고인 성명",
    !department && "신고인 소속",
    !contact.trim() && "신고인 연락처",
    !accused.name.trim() && "피신고인 성명",
    !report.acts.trim() && "주요 행위 또는 발언",
    !pledge && "확인 문구 동의",
    !sameName(signature, name) && "서명",
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;

  async function submit() {
    if (!ready || busy || preparing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/confidential/harassment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          department,
          contact,
          position,
          accused,
          report,
          witnesses,
          evidenceTypes,
          evidenceItems,
          damage,
          requests,
          requestOther,
          incidents,
          other,
          pledge,
          signature,
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

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  const today = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <PartTitle title="직장 내 괴롭힘 신고서">
        <span className="font-semibold text-brand">필수</span> 표시가 있는 칸만 적어도 접수할 수 있습니다.
        나머지는 아시는 만큼 적어주세요.
      </PartTitle>

      <Section no={1} title="신고인 정보">
        <Grid>
          <Field label="성명" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              className="field"
              autoComplete="name"
            />
          </Field>
          <Field label="소속/부서" required>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="field">
              <option value="">선택해 주세요</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="직위·직급">
            <Input value={position} onChange={setPosition} placeholder="예) 매니저" />
          </Field>
          <Field label="연락처" required>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value.slice(0, 80))}
              className="field"
              placeholder="휴대폰 번호 또는 이메일"
            />
          </Field>
        </Grid>
      </Section>

      <Section no={2} title="피신고인 정보">
        <Grid>
          <Field label="성명" required>
            <Input value={accused.name} onChange={(v) => setAccused((a) => ({ ...a, name: v }))} />
          </Field>
          <Field label="소속/부서">
            <input
              value={accused.department}
              onChange={(e) => setAccused((a) => ({ ...a, department: e.target.value.slice(0, MAX_SHORT) }))}
              className="field"
              list="harassment-departments"
              placeholder="모르시면 비워 두셔도 됩니다"
            />
            <datalist id="harassment-departments">
              {departments.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>
          <Field label="직위·직급">
            <Input value={accused.position} onChange={(v) => setAccused((a) => ({ ...a, position: v }))} />
          </Field>
          <Field label="신고인과의 관계">
            <Input
              value={accused.relation}
              onChange={(v) => setAccused((a) => ({ ...a, relation: v }))}
              placeholder="예) 직속 상사, 같은 팀 선임"
            />
          </Field>
        </Grid>
      </Section>

      <Section no={3} title="신고 내용">
        <Grid>
          <Field label="발생 기간">
            <Input
              value={report.period}
              onChange={(v) => setReport((r) => ({ ...r, period: v }))}
              placeholder="예) 2026년 7월 ~ 현재"
            />
          </Field>
          <Field label="발생 장소">
            <Input
              value={report.place}
              onChange={(v) => setReport((r) => ({ ...r, place: v }))}
              placeholder="예) 사무실, 회의실, 사내 메신저"
            />
          </Field>
        </Grid>
        <Field label="주요 행위 또는 발언" required className="mt-4">
          <Area
            value={report.acts}
            onChange={(v) => setReport((r) => ({ ...r, acts: v }))}
            rows={5}
            placeholder="예) 회의 때마다 여러 사람 앞에서 업무와 관계없는 인신공격성 발언을 반복했습니다."
          />
        </Field>
        <Field label="신고 경위" hint="신고하시게 된 이유와 과정" className="mt-4">
          <Area value={report.background} onChange={(v) => setReport((r) => ({ ...r, background: v }))} rows={3} />
        </Field>
        <Field label="반복 여부 및 횟수" className="mt-4">
          <Input
            value={report.repeat}
            onChange={(v) => setReport((r) => ({ ...r, repeat: v }))}
            placeholder="예) 주 2~3회 반복"
          />
        </Field>
      </Section>

      <Section no={4} title="목격자 및 참고인">
        <Repeat
          items={witnesses}
          max={MAX_WITNESSES}
          heading={(i) => `참고인 ${i + 1}`}
          addLabel="목격자·참고인 추가"
          onAdd={() => setWitnesses((w) => [...w, emptyWitness()])}
          onRemove={(i) => setWitnesses((w) => w.filter((_, j) => j !== i))}
          render={(w, i) => {
            const set = (patch: Partial<Witness>) =>
              setWitnesses((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <>
                <Grid>
                  <Field label="성명">
                    <Input value={w.name} onChange={(v) => set({ name: v })} />
                  </Field>
                  <Field label="소속/직위">
                    <Input value={w.affiliation} onChange={(v) => set({ affiliation: v })} />
                  </Field>
                </Grid>
                <Field label="확인 가능한 내용" className="mt-3">
                  <Area value={w.knows} onChange={(v) => set({ knows: v })} rows={2} />
                </Field>
              </>
            );
          }}
        />
      </Section>

      <Section no={5} title="증거자료" hint="가지고 계신 자료를 모두 골라주세요. 자료 목록과 사진은 8항에 적어주세요.">
        <Checks
          options={EVIDENCE_TYPES}
          selected={evidenceTypes}
          onToggle={(v) => setEvidenceTypes((list) => toggle(list, v))}
        />
      </Section>

      <Section no={6} title="피해 내용">
        <Field
          label="해당 행위로 인해 업무 또는 근무환경 등에 발생한 피해"
          hint="업무 수행에 미친 영향 · 근무환경에 미친 영향 · 기타 피해사항"
        >
          <Area value={damage.impact} onChange={(v) => setDamage((d) => ({ ...d, impact: v }))} rows={4} />
        </Field>
        <Field label="현재까지 지속되고 있는 상황" className="mt-4">
          <Area value={damage.ongoing} onChange={(v) => setDamage((d) => ({ ...d, ongoing: v }))} rows={3} />
        </Field>
      </Section>

      <Section no={7} title="신고인 요청사항" hint="원하시는 조치를 모두 골라주세요.">
        <Checks
          options={REQUEST_TYPES}
          selected={requests}
          onToggle={(v) => setRequests((list) => toggle(list, v))}
        />
        {requests.includes("other") && (
          <Field label="기타 요청사항" className="mt-3">
            <Area value={requestOther} onChange={setRequestOther} rows={2} />
          </Field>
        )}
      </Section>

      <Section
        no={8}
        title="첨부자료 목록"
        hint="자료마다 자료명, 자료의 일자, 해당 자료로 확인할 수 있는 내용을 적어주세요."
      >
        <Repeat
          items={evidenceItems}
          max={MAX_EVIDENCE_ITEMS}
          heading={(i) => `자료 ${i + 1}`}
          addLabel="자료 추가"
          onAdd={() => setEvidenceItems((e) => [...e, emptyEvidenceItem()])}
          onRemove={(i) => setEvidenceItems((e) => e.filter((_, j) => j !== i))}
          render={(item, i) => {
            const set = (patch: Partial<EvidenceItem>) =>
              setEvidenceItems((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <>
                <Grid>
                  <Field label="자료명">
                    <Input value={item.name} onChange={(v) => set({ name: v })} placeholder="예) 카카오톡 대화 캡처" />
                  </Field>
                  <Field label="자료의 일자">
                    <Input value={item.date} onChange={(v) => set({ date: v })} placeholder="예) 2026. 9. 3." />
                  </Field>
                </Grid>
                <Field label="해당 자료로 확인할 수 있는 내용" className="mt-3">
                  <Area value={item.proves} onChange={(v) => set({ proves: v })} rows={2} />
                </Field>
              </>
            );
          }}
        />
        <AttachmentPicker
          embedded
          title="사진 첨부"
          hint="메신저 대화 캡처, 사진 등을 바로 올릴 수 있습니다. 최대 5장까지 올릴 수 있습니다."
          images={images}
          onChange={setImages}
          onBusyChange={setPreparing}
        />
      </Section>

      <PartTitle title="피해사실 상세기술서">
        ※ 피해사실이 여러 건인 경우 사건별로 구분하여 작성해 주시기 바랍니다. 피해 내용, 목격자 및 참고인,
        관련 증거자료는 위 신고서 6·4·8항에 적은 내용으로 갈음합니다.
      </PartTitle>

      {incidents.map((inc, i) => {
        const set = (patch: Partial<Incident>) =>
          setIncidents((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <section key={i} className="card p-5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold">사건 {i + 1}</h2>
              {incidents.length > 1 && (
                <RemoveButton onClick={() => setIncidents((all) => all.filter((_, j) => j !== i))} />
              )}
            </div>
            <Grid className="mt-4">
              <Field label="발생 일자 및 시간">
                <Input value={inc.when} onChange={(v) => set({ when: v })} placeholder="예) 2026. 9. 3. 오후 2시경" />
              </Field>
              <Field label="발생 장소">
                <Input value={inc.place} onChange={(v) => set({ place: v })} placeholder="예) 3층 회의실" />
              </Field>
            </Grid>
            <Field
              label="당시 상황"
              hint="사건이 발생하게 된 경위 · 당시 함께 있었던 사람 · 당시 업무 상황 및 전후 사정"
              className="mt-4"
            >
              <Area value={inc.context} onChange={(v) => set({ context: v })} rows={3} />
            </Field>
            <Field
              label="구체적인 피해사실"
              hint="피신고인이 한 구체적인 행동 · 피신고인이 한 구체적인 발언 · 행위가 이루어진 방식 및 당시 상황 · 동일하거나 유사한 행위가 반복된 경우 발생 기간 및 횟수"
              className="mt-4"
            >
              <span className="-mt-0.5 mb-1.5 block text-[12px] text-[#93441f]">
                ※ 가능한 한 실제 있었던 행동 및 발언을 구체적으로 작성해 주시기 바랍니다.
              </span>
              <Area value={inc.facts} onChange={(v) => set({ facts: v })} rows={5} />
            </Field>
            <Field
              label="당시 본인의 대응"
              hint="피신고인에게 의사를 표현했는지 여부 및 내용 · 상급자 또는 회사에 알렸는지 여부 · 기타 당시 취한 대응"
              className="mt-4"
            >
              <Area value={inc.response} onChange={(v) => set({ response: v })} rows={3} />
            </Field>
            <Field
              label="사건 이후 상황"
              hint="피신고인의 추가적인 행동 또는 발언 · 업무 또는 근무환경의 변화 · 현재까지 지속되고 있는 상황"
              className="mt-4"
            >
              <Area value={inc.after} onChange={(v) => set({ after: v })} rows={3} />
            </Field>
          </section>
        );
      })}

      {incidents.length < MAX_INCIDENTS && (
        <AddButton label="사건 추가" onClick={() => setIncidents((all) => [...all, emptyIncident()])} />
      )}

      <section className="card p-5 sm:p-7">
        <h2 className="text-[15px] font-bold">기타 조사 시 참고가 필요한 사항</h2>
        <div className="mt-3">
          <Area value={other} onChange={setOther} rows={3} />
        </div>
      </section>

      <Section no={9} title="신고일 및 신고인 서명">
        <p className="text-sm">
          <span className="text-xs font-semibold text-muted">신고일</span>
          <span className="ml-3 font-semibold tabular-nums" suppressHydrationWarning>
            {today}
          </span>
        </p>
        <label
          className={`mt-4 flex cursor-pointer gap-3 rounded-xl border px-4 py-3.5 transition ${
            pledge ? "border-brand bg-brandSoft" : "border-line bg-white hover:border-brand/40"
          }`}
        >
          <input
            type="checkbox"
            checked={pledge}
            onChange={(e) => setPledge(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#1f4d8f]"
          />
          <span className="text-pretty text-[14px] leading-relaxed text-ink">
            {PLEDGE_TEXT}
            <span className="ml-1.5 text-xs font-semibold text-brand">필수</span>
          </span>
        </label>
        <Field label="서명" required hint="신고인 성명을 적어 서명을 갈음합니다." className="mt-4">
          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value.slice(0, 40))}
            className="field sm:max-w-xs"
            placeholder={name.trim() || "신고인 성명"}
          />
          {signature.trim() && name.trim() && !sameName(signature, name) && (
            <span className="mt-1.5 block text-xs text-[#93441f]">1항에 적은 신고인 성명과 같게 적어주세요.</span>
          )}
        </Field>
      </Section>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="min-w-0 flex-1 text-pretty text-[13px] leading-relaxed text-muted">
          {ready
            ? "적어주신 내용은 조사와 처리에 필요한 범위에서만 다룹니다."
            : `남은 필수 항목: ${missing.join(", ")}`}
        </p>
        <button
          type="submit"
          className="btn-primary px-6 py-2.5 text-sm"
          disabled={!ready || busy || preparing}
        >
          {busy ? "보내는 중…" : preparing ? "사진 담는 중…" : "접수하기"}
        </button>
      </div>
    </form>
  );
}

// ── 작은 부품 ───────────────────────────────────────────────────────────

function PartTitle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="px-1 pt-2">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mt-1 text-pretty text-[13px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function Section({
  no,
  title,
  hint,
  children,
}: {
  no: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-7">
      <div className="flex items-baseline gap-2.5">
        <span className="text-xs font-bold tabular-nums text-brand">{String(no).padStart(2, "0")}</span>
        <h2 className="text-[15px] font-bold">{title}</h2>
      </div>
      {hint && <p className="mt-1 text-pretty text-[13px] leading-relaxed text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-3 sm:grid-cols-2 sm:gap-4 ${className}`}>{children}</div>;
}

function Field({
  label,
  required,
  hint,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-muted">
        {label}
        {required && <span className="ml-1.5 text-[11px] font-semibold text-brand">필수</span>}
      </span>
      {hint && <span className="-mt-0.5 mb-1.5 block text-pretty text-[12px] leading-relaxed text-muted/90">{hint}</span>}
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, MAX_SHORT))}
      className="field"
      placeholder={placeholder}
    />
  );
}

function Area({
  value,
  onChange,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, MAX_LONG))}
      rows={rows}
      className="field resize-y leading-relaxed"
      placeholder={placeholder}
    />
  );
}

function Checks({
  options,
  selected,
  onToggle,
}: {
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[14px] transition ${
              on ? "border-brand bg-brandSoft font-semibold text-brand" : "border-line bg-white text-ink hover:border-brand/40"
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => onToggle(o.value)}
              className="h-4 w-4 shrink-0 accent-[#1f4d8f]"
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

function Repeat<T>({
  items,
  max,
  heading,
  addLabel,
  onAdd,
  onRemove,
  render,
}: {
  items: T[];
  max: number;
  heading: (i: number) => string;
  addLabel: string;
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (item: T, i: number) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-line p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-bold text-ink">{heading(i)}</p>
            <RemoveButton onClick={() => onRemove(i)} />
          </div>
          {render(item, i)}
        </div>
      ))}
      {items.length < max && <AddButton label={addLabel} onClick={onAdd} />}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-muted transition hover:border-brand/50 hover:bg-brandTint hover:text-brand"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 4v12M4 10h12" />
      </svg>
      {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
    >
      빼기
    </button>
  );
}
