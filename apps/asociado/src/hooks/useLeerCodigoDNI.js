/**
 * useLeerCodigoDNI
 *
 * Lee el QR (frente, DNI nuevo) o PDF417 (dorso, todos los formatos)
 * desde una imagen de archivo usando @zxing/library.
 *
 * El PDF417 del dorso contiene:
 * APELLIDO@NOMBRE@SEXO@DNI@EJEMPLAR@FECHA_NAC@FECHA_EMISION@@CUIL
 *
 * Devuelve: { leer } donde
 *   leer(file) → Promise<{ ok: boolean, datos?, error? }>
 *     ok: true  → { datos: { socNom, socDocNro, cliFecNac, cuil } }
 *     ok: false → { error: string }
 */
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";

/** Parsea el contenido del código PDF417/QR del DNI argentino */
function parsearCodigoDNI(texto) {
  // Formato: APELLIDO@NOMBRE@SEXO@DNI@EJEMPLAR@FECHA_NAC@FECHA_EMISION@@CUIL
  const partes = texto.split("@");
  if (partes.length < 8) return null;

  const apellido   = partes[0]?.trim();
  const nombre     = partes[1]?.trim();
  const dni        = partes[3]?.trim().replace(/\D/g, ""); // solo dígitos
  const fechaNacRaw = partes[5]?.trim(); // DD/MM/AAAA
  const cuil       = partes[8]?.trim().replace(/\D/g, "");

  if (!apellido || !nombre || !dni) return null;

  // Convertir fecha DD/MM/AAAA → YYYY-MM-DD
  let cliFecNac = null;
  if (fechaNacRaw && /\d{2}\/\d{2}\/\d{4}/.test(fechaNacRaw)) {
    const [dia, mes, anio] = fechaNacRaw.split("/");
    cliFecNac = `${anio}-${mes}-${dia}`;
  }

  return {
    socNom:    `${apellido} ${nombre}`,
    socDocNro: dni,
    cliFecNac,
    cuil: cuil || null,
  };
}

/** Convierte un File a HTMLImageElement */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo cargar la imagen")); };
    img.src = url;
  });
}

/** Dibuja una imagen en un canvas y devuelve el elemento canvas */
function imageToCanvas(img) {
  const canvas = document.createElement("canvas");
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/**
 * Intenta leer el código en múltiples rotaciones (0°, 90°, 180°, 270°)
 * para manejar fotos tomadas en cualquier orientación.
 */
async function leerConRotaciones(file) {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.PDF_417,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);
  const img = await fileToImage(file);

  const rotaciones = [0, 90, 180, 270];

  for (const grados of rotaciones) {
    try {
      const canvas = document.createElement("canvas");
      const rad = (grados * Math.PI) / 180;
      const sinA = Math.abs(Math.sin(rad));
      const cosA = Math.abs(Math.cos(rad));

      canvas.width  = grados % 180 === 0 ? img.naturalWidth  : img.naturalHeight;
      canvas.height = grados % 180 === 0 ? img.naturalHeight : img.naturalWidth;

      const ctx = canvas.getContext("2d");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const resultado = await reader.decodeFromCanvas(canvas);
      if (resultado?.getText()) {
        return resultado.getText();
      }
    } catch {
      // Continuar con la siguiente rotación
    }
  }

  return null;
}

export function useLeerCodigoDNI() {
  const leer = async (file) => {
    try {
      const texto = await leerConRotaciones(file);

      if (!texto) {
        return { ok: false, error: "No se pudo leer el código del DNI. Asegurate de que el código esté visible y bien iluminado." };
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
