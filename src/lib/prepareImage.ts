import { TARGET_ATTACHMENT_BYTES } from "./attachmentRules";

/**
 * 접수 화면에서 고른 사진을 올리기 좋게 줄입니다(브라우저 전용).
 *
 * 긴 변 2000px 의 JPEG 로 다시 그려 한 장이 600KB 안에 들게 합니다. 휴대폰 원본(3~8MB)을
 * 그대로 보내면 요청 한도를 넘기고, 느린 회선에서 접수가 끝나지 않습니다.
 * 다시 그리는 과정에서 촬영 위치(GPS) 같은 사진 속 부가 정보도 함께 빠집니다.
 */
export interface PreparedImage {
  key: string;
  name: string;
  /** base64(접두어 없이) */
  data: string;
  bytes: number;
  /** 미리보기용 주소(URL.createObjectURL) */
  preview: string;
}

type Source = ImageBitmap | HTMLImageElement;

async function decode(file: File): Promise<Source> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // 아래 <img> 방식으로 한 번 더 시도합니다.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", quality),
  );
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const source = await decode(file);
  const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  if (!width || !height) throw new Error("decode");

  try {
    let longSide = 2000;
    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, longSide / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      // 투명한 PNG 가 검게 나오지 않도록 흰 바탕을 먼저 깝니다.
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.75, 0.65]) {
        const blob = await encode(canvas, quality);
        if (blob.size <= TARGET_ATTACHMENT_BYTES) {
          return {
            key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: file.name.replace(/\.[^.]+$/, "") + ".jpg",
            data: await toBase64(blob),
            bytes: blob.size,
            preview: URL.createObjectURL(blob),
          };
        }
      }
      longSide = Math.round(longSide * 0.75);
    }
    throw new Error("too-big");
  } finally {
    if ("close" in source) source.close();
  }
}
