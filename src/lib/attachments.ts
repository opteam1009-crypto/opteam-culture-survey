import { ensureSchema, sql } from "./db";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_TOTAL,
} from "./attachmentRules";

/**
 * 첨부 사진(제안·고충·신고 공용).
 *
 * 사진은 DB(attachments 테이블)에 그대로 둡니다. 따로 저장소를 붙이면 설정할 것이
 * 늘고, 괴롭힘 증빙처럼 민감한 사진이 주소만 알면 열리는 곳에 놓일 수 있습니다.
 * DB 에 두면 대시보드 로그인을 거친 요청만 사진을 받을 수 있고, 원래 건을 지우면
 * 사진도 함께 지워집니다(on delete cascade).
 */

export interface ParsedAttachment {
  filename: string;
  mime: string;
  data: Buffer;
}

export interface AttachmentMeta {
  id: string;
  filename: string;
  mime: string;
  size: number;
}

/** 파일 앞머리로 형식을 판별합니다. 브라우저가 알려준 형식은 믿지 않습니다. */
function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function cleanFilename(raw: unknown, index: number): string {
  const base = typeof raw === "string" ? raw.split(/[\\/]/).pop() ?? "" : "";
  // 제어문자와 따옴표를 빼고 길이를 줄입니다. 내려받을 때 헤더에 들어가는 값입니다.
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim().slice(0, 100);
  return cleaned || `사진${index + 1}.jpg`;
}

/** 접수 요청의 attachments 를 검사합니다. 없으면 빈 목록. */
export function parseAttachments(
  raw: unknown,
): { ok: true; files: ParsedAttachment[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, files: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "첨부 사진 형식이 올바르지 않습니다." };
  if (raw.length > MAX_ATTACHMENTS) {
    return { ok: false, error: `사진은 ${MAX_ATTACHMENTS}장까지 올릴 수 있습니다.` };
  }

  const files: ParsedAttachment[] = [];
  let total = 0;
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as { name?: unknown; data?: unknown } | null;
    if (!item || typeof item.data !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(item.data)) {
      return { ok: false, error: "첨부 사진을 읽지 못했습니다. 다시 올려주세요." };
    }
    const data = Buffer.from(item.data, "base64");
    if (data.length === 0 || data.length > MAX_ATTACHMENT_BYTES) {
      return { ok: false, error: "사진 한 장이 너무 큽니다. 다른 사진으로 올려주세요." };
    }
    const mime = sniffImage(data);
    if (!mime) return { ok: false, error: "사진 파일(JPG·PNG·WEBP)만 올릴 수 있습니다." };
    total += data.length;
    if (total > MAX_ATTACHMENT_TOTAL) {
      return { ok: false, error: "사진 용량이 너무 큽니다. 장수를 줄여 다시 올려주세요." };
    }
    files.push({ filename: cleanFilename(item.name, i), mime, data });
  }
  return { ok: true, files };
}

/** unnest 로 한 번에 넣기 위한 열 배열. 본문 insert 와 같은 문장에서 씁니다. */
export function attachmentColumns(files: ParsedAttachment[]) {
  return {
    names: files.map((f) => f.filename),
    mimes: files.map((f) => f.mime),
    sizes: files.map((f) => f.data.length),
    datas: files.map((f) => f.data),
  };
}

export async function loadAttachmentList(
  owner: { suggestionId: string } | { reportId: string },
): Promise<AttachmentMeta[]> {
  await ensureSchema();
  const suggestionId = "suggestionId" in owner ? owner.suggestionId : null;
  const reportId = "reportId" in owner ? owner.reportId : null;
  return (await sql()`
    select id, filename, mime, size
      from attachments
     where (${suggestionId}::uuid is not null and suggestion_id = ${suggestionId}::uuid)
        or (${reportId}::uuid is not null and report_id = ${reportId}::uuid)
     order by created_at, id
  `) as AttachmentMeta[];
}

export async function loadAttachmentFile(
  id: string,
): Promise<{ filename: string; mime: string; data: Buffer } | null> {
  await ensureSchema();
  const rows = (await sql()`
    select filename, mime, data from attachments where id = ${id}::uuid
  `) as { filename: string; mime: string; data: Buffer }[];
  return rows[0] ?? null;
}
