const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret }       = require("firebase-functions/params");

const API_CELTA_TOKEN = defineSecret("API_CELTA_TOKEN");
const API_CELTA_URL   = defineSecret("API_CELTA_URL");

exports.obtenerDatosAsociado = onCall(
  {
    region:  "us-east1",
    secrets: [API_CELTA_TOKEN, API_CELTA_URL],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
    ],
  },
  async ({ auth: reqAuth }) => {
    if (!reqAuth || reqAuth.token.rol !== "asociado") {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni } = reqAuth.token;

    let data;
    try {
      const res = await fetch(
        `${API_CELTA_URL.value()}/api/data?cliDocNro=${dni}`,
        {
          headers: { Authorization: `Bearer ${API_CELTA_TOKEN.value()}` },
        }
      );

      if (!res.ok) {
        const texto = await res.text();
        console.error("API CELTA error:", res.status, texto);
        throw new Error(`API respondió ${res.status}`);
      }

      data = await res.json();
    } catch (e) {
      console.error("Error consultando API CELTA:", e.message);
      throw new HttpsError("internal", "Error al consultar el sistema de CELTA");
    }

    // La API devuelve un objeto con titular y array de adheridos
    // Ajustar según la estructura real que devuelve la API
    const titular   = data.titular   ?? data;
    const adheridos = data.adheridos ?? data.familiares ?? [];

    return {
      titular: {
        clicod: titular.clicod ?? titular.CliCod,
        sumnro: titular.sumnro ?? titular.SumNro,
        cliape: titular.cliape ?? titular.CliApe,
      },
      adheridos: adheridos.map((a) => ({
        id:             a.id ?? a.CliDocNro,
        CliApeContrato: a.CliApeContrato,
        CliDocNro:      a.CliDocNro,
        CliFecNac:      a.CliFecNac,
        SumFacFAd:      a.SumFacFAd,
        PareDsc:        a.PareDsc,
      })),
    };
  }
);
