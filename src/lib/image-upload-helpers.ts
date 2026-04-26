// Определение формата картинки: при загрузке с Windows часто `file.type` пустой — опираемся на сигнатуры и имя файла
import { Buffer } from "node:buffer";

const NAME_EXT = /^.+\.(jpe?g|png|gif|webp|svg)$/i;

/**
 * Сигнатура бинарных форматов; для SVG смотрим начало как UTF-8-текст
 * @param allowSvg — для фона витрины false (не принимаем вектор в фото-фоне)
 */
export function detectImageExtensionFromBuffer(buf: Buffer, allowSvg: boolean): string | null {
  if (buf.length < 3) {
    return null;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return ".jpg";
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return ".png";
  }
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return ".gif";
  }
  if (buf.length >= 12) {
    const isRiff = buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;
    const isWebp = buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50;
    if (isRiff && isWebp) {
      return ".webp";
    }
  }
  if (allowSvg) {
    const head = buf.slice(0, Math.min(500, buf.length)).toString("utf8").trimStart();
    if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("svg"))) {
      return ".svg";
    }
  }
  return null;
}

/** Нормализует расширение с имени файла к виду, совместимому с именами на диске */
function extFromFileName(name: string): string | null {
  const m = name.match(NAME_EXT);
  if (!m) {
    return null;
  }
  const e = m[1].toLowerCase();
  if (e === "jpeg" || e === "jpg") {
    return ".jpg";
  }
  return `.${e}`;
}

/**
 * Итоговое расширение для загрузки: сначала Content-Type, потом сигнатура, потом имя файла
 * @param allowSvg — true только для логотипа
 */
export function resolveExtensionForImageUpload(
  file: File,
  buffer: Buffer,
  allowSvg: boolean
): { ext: string } | { error: string } {
  // На сервере Next поле .type у File обычно задан, но в Windows/браузерах бывает пусто
  const fromMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    ...(allowSvg ? { "image/svg+xml": ".svg" } : {}),
  };
  const t = (file.type || "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (t && fromMime[t]) {
    return { ext: fromMime[t] };
  }
  const fromBuf = detectImageExtensionFromBuffer(buffer, allowSvg);
  if (fromBuf) {
    if (fromBuf === ".svg" && !allowSvg) {
      return { error: "Для фона витрины укажите растровую картинку: JPEG, PNG, WebP или GIF" };
    }
    return { ext: fromBuf };
  }
  const fromName = file.name ? extFromFileName(file.name) : null;
  if (fromName) {
    if (fromName === ".svg" && !allowSvg) {
      return { error: "Для фона витрины укажите растровую картинку: JPEG, PNG, WebP или GIF" };
    }
    if ([".jpg", ".png", ".gif", ".webp", ".svg"].includes(fromName)) {
      return { ext: fromName };
    }
  }
  return {
    error: allowSvg
      ? "Не удалось определить формат. Используйте JPEG, PNG, WebP, GIF или SVG"
      : "Не удалось определить формат. Используйте JPEG, PNG, WebP или GIF (для снимков с телефона попробуйте другое фото или пересохраните как PNG)",
  };
}
