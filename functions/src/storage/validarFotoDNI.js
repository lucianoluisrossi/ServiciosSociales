const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001"; // rápido y económico

/**
 * validarFotoDNI
 *
 * Recibe una imagen en base64 y valida con IA si corresponde
 * al frente o dorso de un DNI argentino.
 *
 * Request data:
 *   { imagenBase64: string, mediaType: string, lado: "frente" | "dorso" }
 *
 * Response:
 *   { esValido: boolean, motivo: string }
 *
 * Solo accesible por usuarios con rol "asociado".
 * Rate limit implícito: Firebase onCall + 1 llamada por imagen.
 */
exports.validarFotoDNI = onCall(
  {
    region: "us-east1",
    secrets: [ANTHROPIC_API_KEY],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    // Limitar tamaño del request: imágenes base64 pueden ser grandes
    // Firebase tiene un límite de 10MB por defecto en onCall
    timeoutSeconds: 30,
  },
  async ({ auth: reqAuth, data }) => {
    // ── Autenticación: solo asociados ──────────────────────────────────────
    if (!reqAuth || reqAuth.token.rol !== "asociado") {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { imagenBase64, mediaType, lado } = data;

    // ── Validación de parámetros ───────────────────────────────────────────
    if (!imagenBase64 || typeof imagenBase64 !== "string") {
      throw new HttpsError("invalid-argument", "imagenBase64 requerido");
    }
    if (!["frente", "dorso"].includes(lado)) {
      throw new HttpsError("invalid-argument", "lado debe ser 'frente' o 'dorso'");
    }

    const tipoImagen = mediaType && mediaType.startsWith("image/")
      ? mediaType
      : "image/jpeg";

    // ── Prompt ────────────────────────────────────────────────────────────
    const ladoTexto = lado === "frente"
      ? "el frente (cara con foto, nombre completo y número de DNI)"
      : "el dorso (cara con código de barras o información adicional)";

    const prompt = `Analizá esta imagen y determiná si muestra claramente ${ladoTexto} de un Documento Nacional de Identidad (DNI) argentino.

Respondé ÚNICAMENTE con un objeto JSON con este formato exacto, sin texto adicional:
{"esValido": true, "motivo": "descripción breve"}
o
{"esValido": false, "motivo": "descripción breve del problema"}

Criterios para rechazar:
- No es un DNI argentino (es otro documento, una foto de persona, paisaje, selfie, etc.)
- La imagen está muy borrosa o tiene mala iluminación
- El DNI no está completamente visible o está muy recortado
- Es el lado incorrecto (se pide ${lado} pero se ve el otro lado)
- La imagen está rotada más de 45 grados`;

    // ── Llamada a Anthropic ────────────────────────────────────────────────
    let response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 150,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: tipoImagen,
                    data: imagenBase64,
                  },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Error conectando con Anthropic:", err);
      throw new HttpsError(
        "unavailable",
        "El servicio de validación no está disponible. Intentá más tarde."
      );
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`Anthropic respondió ${response.status}:`, errorBody);
      throw new HttpsError(
        "unavailable",
        "El servicio de validación devolvió un error. Intentá más tarde."
      );
    }

    // ── Parsear respuesta ──────────────────────────────────────────────────
    const anthropicData = await response.json();
    const texto = anthropicData.content?.[0]?.text ?? "";

    try {
      const clean = texto.replace(/```json|```/g, "").trim();
      const resultado = JSON.parse(clean);

      if (typeof resultado.esValido !== "boolean") {
        throw new Error("Formato inesperado");
      }

      return {
        esValido: resultado.esValido,
        motivo: resultado.motivo ?? "",
      };
    } catch (parseErr) {
      console.error("No se pudo parsear respuesta de Anthropic:", texto);
      throw new HttpsError(
        "internal",
        "Respuesta inesperada del validador. Intentá de nuevo."
      );
    }
  }
);
