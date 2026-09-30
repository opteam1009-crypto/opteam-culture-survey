/**
 * 사진 첨부 규칙(접수 화면과 서버 공용).
 *
 * 사진은 브라우저에서 줄여(긴 변 2000px, JPEG) 접수 요청에 함께 실어 보냅니다.
 * Vercel 함수가 한 번에 받을 수 있는 크기(4.5MB)를 넘지 않도록, 한 장·전체 상한을
 * 그보다 넉넉히 낮게 둡니다. 휴대폰 사진 한 장은 줄이면 보통 300~600KB 입니다.
 */
export const MAX_ATTACHMENTS = 5;
/** 서버가 받는 한 장 상한(디코딩 후 바이트). */
export const MAX_ATTACHMENT_BYTES = 900_000;
/** 서버가 받는 한 번 접수의 전체 상한. base64 로 부풀어도 4.5MB 안에 듭니다. */
export const MAX_ATTACHMENT_TOTAL = 3_200_000;
/** 브라우저에서 줄일 때의 목표 크기. */
export const TARGET_ATTACHMENT_BYTES = 600_000;

/** 접수 요청에 실어 보내는 한 장. data 는 base64(접두어 없이). */
export interface AttachmentUpload {
  name: string;
  data: string;
}
