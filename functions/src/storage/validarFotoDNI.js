const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

/**
 * validarFotoDNI
 *
 * Valida si la imagen es un DNI argentino.
 * Si es el frente y es válido, además extrae nombre, DNI y fecha de nacimiento.
 *
 * Request:  { imagenBase64: string, mediaType: string, lado: "frente" | "dorso" }
 * Response: { esValido: boolean, motivo: string, datos?: { socNom, socDocNro, cliFecNac } }
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
    timeoutSeconds: 30,
  },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || reqAuth.token.rol !== "asociado") {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { imagenBase64, mediaType, lado } = data;

    if (!imagenBase64 || typeof imagenBase64 !== "string") {
      throw new HttpsError("invalid-argument", "imagenBase64 requerido");
    }
    if (!["frente", "dorso"].includes(lado)) {
      throw new HttpsError("invalid-argument", "lado debe ser 'frente' o 'dorso'");
    }

    const tipoImagen = mediaType && mediaType.startsWith("image/")
      ? mediaType
      : "image/jpeg";

    // ── Prompt: distinto según lado ───────────────────────────────────────
    const prompt = lado === "frente"
      ? `Analizá esta imagen y determiná si es el frente de un Documento Nacional de Identidad (DNI) argentino, ya sea el formato nuevo (con foto grande y fondo celeste/verde) o el formato tarjeta plástica anterior (con campos APELLIDO/S, NOMBRE/S, NUMERO DE DOCUMENTO y zona MRZ con líneas de signos "<").

Respondé ÚNICAMENTE con un objeto JSON, sin texto adicional:

Si la imagen NO es válida:
{"esValido": false, "motivo": "descripción breve del problema"}

Si la imagen ES válida, extraé también los datos del documento:
{"esValido": true, "motivo": "ok", "datos": {"socNom": "APELLIDO NOMBRE", "socDocNro": "12345678", "cliFecNac": "YYYY-MM-DD"}}

Aceptá la imagen si:
- Se puede identificar que es el frente de un DNI argentino en cualquier formato, aunque tenga algo de reflejo, leve desenfoque, no esté perfectamente centrado o esté rotada — eso es normal al fotografiar con celular
- Formato nuevo: se ven campos como Apellido, Nombre, DNI, Fecha de Nacimiento
- Formato tarjeta plástica: se ven campos APELLIDO/S, NOMBRE/S, NUMERO DE DOCUMENTO, y/o líneas MRZ (IDARG...)

Rechazá SOLO si:
- Es claramente otro documento o un objeto que no es un DNI argentino
- Es el dorso del DNI (no el frente)
- La imagen está completamente ilegible, en negro o en blanco
- Es una foto de una persona, paisaje, pantalla u objeto que no es un documento

Para la extracción de datos:
- socNom: apellido y nombre completos en mayúsculas (en formato tarjeta: combiná APELLIDO/S + NOMBRE/S; también podés leerlo de la línea MRZ como "PINELLI<<JULIO<OMAR" → "PINELLI JULIO OMAR")
- socDocNro: solo los dígitos del número de DNI, sin puntos ni espacios (ej: "17.835.382" → "17835382"; también podés leerlo de la línea MRZ "IDARG17835382")
- cliFecNac: en el formato nuevo está en el frente; en el formato tarjeta plástica puede no estar en el frente — en ese caso poné null y se leerá del dorso
- Si no podés leer algún dato con certeza, poné null en ese campo`

      : `Analizá esta imagen y determiná si podría ser el dorso de un Documento Nacional de Identidad (DNI) argentino, ya sea el formato nuevo o el formato tarjeta plástica anterior (con domicilio, fecha y lugar de nacimiento, huella dactilar y código de barras PDF417).

Respondé ÚNICAMENTE con un objeto JSON, sin texto adicional:

Si la imagen NO es válida:
{"esValido": false, "motivo": "descripción breve del problema"}

Si la imagen ES válida:
{"esValido": true, "motivo": "ok", "datos": {"cliFecNac": "YYYY-MM-DD"}}

Aceptá la imagen si:
- Se ve algún elemento típico del dorso de un DNI argentino (código de barras, PDF417, huella dactilar, domicilio, fecha de nacimiento, fondo con guilloche, etc.)
- La imagen tiene algo de movimiento, reflejo, rotación o no está perfectamente encuadrada — eso es normal al fotografiar con celular
- La imagen está rotada en cualquier ángulo — la rotación NO es motivo de rechazo

Rechazá SOLO si:
- Es claramente otro documento (pasaporte, licencia de conducir, tarjeta de crédito, etc.)
- Es una foto de una persona, paisaje, pantalla u objeto que no es un documento
- La imagen está completamente en blanco, negra o es ilegible

Para la extracción de datos:
- cliFecNac: si ves el campo "FECHA Y LUGAR DE NACIMIENTO" (formato tarjeta plástica, ej: "13 SET 1966"), convertilo a YYYY-MM-DD. Si no podés leerlo con certeza, poné null.`;

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
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: tipoImagen, data: imagenBase64 },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Error conectando con Anthropic:", err);
      throw new HttpsError("unavailable", "El servicio de validación no está disponible. Intentá más tarde.");
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`Anthropic respondió ${response.status}:`, errorBody);
      throw new HttpsError("unavailable", "El servicio de validación devolvió un error. Intentá más tarde.");
    }

    const anthropicData = await response.json();
    const texto = anthropicData.content?.[0]?.text ?? "";

    try {
      const clean = texto.replace(/```json|```/g, "").trim();
      const resultado = JSON.parse(clean);

      if (typeof resultado.esValido !== "boolean") throw new Error("Formato inesperado");

      if (!resultado.esValido) {
        return { esValido: false, motivo: resultado.motivo ?? "" };
      }

      // Válido — devolver datos extraídos según lado
      const respuesta = { esValido: true, motivo: resultado.motivo ?? "ok" };
      if (resultado.datos) {
        if (lado === "frente") {
          respuesta.datos = {
            socNom:    resultado.datos.socNom    ?? null,
            socDocNro: resultado.datos.socDocNro ?? null,
            cliFecNac: resultado.datos.cliFecNac ?? null,
          };
        } else {
          // Dorso: solo fecha de nacimiento (útil para DNI formato tarjeta plástica)
          respuesta.datos = {
            cliFecNac: resultado.datos.cliFecNac ?? null,
          };
        }
      }
      return respuesta;

    } catch (parseErr) {
      console.error("No se pudo parsear respuesta de Anthropic:", texto);
      throw new HttpsError("internal", "Respuesta inesperada del validador. Intentá de nuevo.");
    }
  }
);
