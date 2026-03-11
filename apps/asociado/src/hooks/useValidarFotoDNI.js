/**
 * useValidarFotoDNI
 * Valida que una imagen corresponda al frente o dorso de un DNI argentino.
 * Paso 1: heurísticas locales (solo tamaño de archivo) — instantáneo, sin costo
 * Paso 2: validación con IA vía Cloud Function — la API key nunca sale al cliente
 */
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const validarFotoDNIFn = httpsCallable(functions, "validarFotoDNI");

const MIN_FILE_SIZE_KB = 30;
const MAX_FILE_SIZE_MB = 5;

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
 * Validaciones rápidas locales sin IA (solo tamaño).
 * Devuelve { ok: true } o { ok: false, mensaje: string }
 */
function validarHeuristicas(file) {
  const sizeKB = file.size / 1024;
  const sizeMB = file.size / (1024 * 1024);

  if (sizeKB < MIN_FILE_SIZE_KB) {
    return { ok: false, mensaje: "La imagen es demasiado pequeña. Tomá una foto directamente con la cámara." };
  }
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return { ok: false, mensaje: "La imagen supera los 5 MB. Reducí la resolución e intentá de nuevo." };
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
    // Paso 1: heurísticas locales (tamaño)
    const heuristica = validarHeuristicas(file);
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
