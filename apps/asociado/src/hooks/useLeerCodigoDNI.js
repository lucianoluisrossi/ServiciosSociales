/**
 * useLeerCodigoDNI
 * Lee QR (frente) o PDF417 (dorso) del DNI argentino.
 * Optimizado para fotos de cámara en Android Chrome.
 */
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";

const MAX_DIMENSION = 1500;

function parsearCodigoDNI(texto) {
  const partes = texto.split("@");
  if (partes.length < 6) return null;

  const apellido    = partes[0]?.trim();
  const nombre      = partes[1]?.trim();
  const dni         = partes[3]?.trim().replace(/\D/g, "");
  const fechaNacRaw = partes[5]?.trim();
  const cuil        = partes[8]?.trim().replace(/\D/g, "") || null;

  if (!apellido || !nombre || !dni || dni.length < 7) return null;

  let cliFecNac = null;
  if (fechaNacRaw && /\d{2}\/\d{2}\/\d{4}/.test(fechaNacRaw)) {
    const [dia, mes, anio] = fechaNacRaw.split("/");
    cliFecNac = `${anio}-${mes}-${dia}`;
  }

  return { socNom: `${apellido} ${nombre}`, socDocNro: dni, cliFecNac, cuil };
}

/**
 * Escala y rota la imagen en un canvas, luego crea un HTMLImageElement
 * apuntando a ese canvas via toDataURL — evita problemas de CORS con blob URLs.
 */
function prepararImagenElement(file, grados = 0) {
  return new Promise((resolve, reject) => {
    const fileUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(fileUrl);

      // Escalar
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const max = Math.max(w, h);
      if (max > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / max;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      // Canvas rotado
      const rad = (grados * Math.PI) / 180;
      const canvas = document.createElement("canvas");
      canvas.width  = grados % 180 === 0 ? w : h;
      canvas.height = grados % 180 === 0 ? h : w;

      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      // Crear img element con dataURL (sin CORS)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const imgEl = new Image();
      imgEl.onload  = () => resolve(imgEl);
      imgEl.onerror = () => reject(new Error("No se pudo preparar la imagen"));
      imgEl.src = dataUrl;
    };

    img.onerror = () => { URL.revokeObjectURL(fileUrl); reject(new Error("No se pudo cargar")); };
    img.src = fileUrl;
  });
}

async function leerConRotaciones(file) {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417, BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);

  for (const grados of [0, 90, 270, 180]) {
    try {
      const imgEl = await prepararImagenElement(file, grados);
      const resultado = await reader.decodeFromImageElement(imgEl);
      const texto = resultado?.getText();
      if (texto) return texto;
    } catch {
      // NotFoundException esperado — continuar con siguiente rotación
    }
  }

  return null;
}

export function useLeerCodigoDNI() {
  const leer = async (file) => {
    try {
      const texto = await leerConRotaciones(file);

      if (!texto) {
        return {
          ok: false,
          error: "No se pudo leer el código del DNI. Asegurate de que el código esté bien iluminado y completamente visible.",
        };
      }

      const datos = parsearCodigoDNI(texto);
      if (!datos) {
        return { ok: false, error: "El código leído no corresponde a un DNI argentino." };
      }

      return { ok: true, datos };
    } catch (err) {
      console.error("Error leyendo código DNI:", err);
      return { ok: false, error: "No se pudo procesar la imagen. Intentá de nuevo." };
    }
  };

  return { leer };
}
