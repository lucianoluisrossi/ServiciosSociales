/**
 * useValidarFotoDNI
 * Valida que una imagen corresponda al frente o dorso de un DNI argentino.
 * Paso 1: heurísticas locales (tamaño, aspect ratio) — instantáneo, sin costo
 * Paso 2: validación con IA vía Cloud Function — la API key nunca sale al cliente
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const validarFotoDNIFn = httpsCallable(functions, "validarFotoDNI");

const MIN_FILE_SIZE_KB = 30;
const MAX_FILE_SIZE_MB = 5;
const MIN_ASPECT_RATIO = 1.3;   // DNI es horizontal ~1.58:1
const MAX_ASPECT_RATIO = 2.2;

/** Convierte un File a base64 (sin el prefijo data:...) */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Lee el tag EXIF Orientation desde los primeros bytes del archivo JPEG.
 * Orientaciones 5-8 indican rotación 90° o 270° → width y height están invertidos.
 * Devuelve true si hay que swappear las dimensiones.
 */
async function necesitaSwapDimensiones(file) {
  try {
    if (!file.type.includes("jpeg") && !file.type.includes("jpg")) return false;

    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0) !== 0xFFD8) return false;

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      offset += 2;

      if (marker === 0xFFE1) {
        offset += 2; // saltar longitud del segmento
        if (view.getUint32(offset) !== 0x45786966) return false; // "Exif"

        const tiffOffset = offset + 6;
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;
        const readU16 = (o) => view.getUint16(tiffOffset + o, littleEndian);
        const readU32 = (o) => view.getUint32(tiffOffset + o, littleEndian);

        const ifdOffset = readU32(4);
        const entries = readU16(ifdOffset);

        for (let i = 0; i < entries; i++) {
          const e = ifdOffset + 2 + i * 12;
          if (readU16(e) === 0x0112) { // Orientation tag
            const orientation = readU16(e + 8);
            return orientation >= 5 && orientation <= 8;
          }
        }
        return false;
      } else {
        offset += view.getUint16(offset);
      }
    }
  } catch {
    // Si falla, no swappeamos (mejor falso negativo que bloquear)
  }
  return false;
}

/** Obtiene dimensiones reales corregidas por orientación EXIF */
async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: width, naturalHeight: height } = img;
      const swap = await necesitaSwapDimensiones(file);
      if (swap) [width, height] = [height, width];
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen"));
    };
    img.src = url;
  });
}

/**
 * Validaciones rápidas locales sin IA.
 * Devuelve { ok: true } o { ok: false, mensaje: string }
 */
async function validarHeuristicas(file) {
  const sizeKB = file.size / 1024;
  const sizeMB = file.size / (1024 * 1024);

  if (sizeKB < MIN_FILE_SIZE_KB) {
    return { ok: false, mensaje: "La imagen es demasiado pequeña. Tomá una foto directamente con la cámara." };
  }
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return { ok: false, mensaje: "La imagen supera los 5 MB. Reducí la resolución e intentá de nuevo." };
  }

  try {
    const { width, height } = await getImageDimensions(file);
    const ratio = width / height;
    if (ratio < MIN_ASPECT_RATIO) {
      return { ok: false, mensaje: "La imagen parece estar en posición vertical. El DNI debe fotografiarse en horizontal." };
    }
    if (ratio > MAX_ASPECT_RATIO) {
      return { ok: false, mensaje: "La imagen es demasiado apaisada. Encuadrá solo el DNI en la foto." };
    }
  } catch {
    // Si no podemos leer dimensiones, dejamos pasar a la IA
  }

  return { ok: true };
}

/**
 * Hook principal.
 * validar(file, lado) → Promise<{ ok: boolean, mensaje?: string }>
 *   - Lanza Error si la Cloud Function no está disponible (para que el componente bloquee)
 */
export function useValidarFotoDNI() {
  const validar = async (file, lado) => {
    // Paso 1: heurísticas locales
    const heuristica = await validarHeuristicas(file);
    if (!heuristica.ok) return heuristica;

    // Paso 2: validación con IA vía Cloud Function
    const imagenBase64 = await fileToBase64(file);
    const mediaType = file.type || "image/jpeg";

    const result = await validarFotoDNIFn({ imagenBase64, mediaType, lado });
    const { esValido, motivo } = result.data;

    if (esValido) return { ok: true };

    return {
      ok: false,
      mensaje: motivo
        ? `La foto no es válida: ${motivo}. Por favor tomá una nueva foto del ${lado} del DNI.`
        : `La imagen no parece mostrar el ${lado} de un DNI argentino. Volvé a intentarlo con buena iluminación.`,
    };
  };

  return { validar };
}
