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

    let titular, adheridos;
    try {
      const [resTitular, resAdheridos] = await Promise.all([
        fetch(`${API_CELTA_URL.value()}/titular?dni=${dni}`, {
          headers: { Authorization: `Bearer ${API_CELTA_TOKEN.value()}` },
        }),
        fetch(`${API_CELTA_URL.value()}/adheridos?dni=${dni}`, {
          headers: { Authorization: `Bearer ${API_CELTA_TOKEN.value()}` },
        }),
      ]);

      if (!resTitular.ok) throw new Error("Error al obtener titular");
      titular   = await resTitular.json();
      adheridos = resAdheridos.ok ? await resAdheridos.json() : [];
    } catch {
      throw new HttpsError("internal", "Error al consultar el sistema de CELTA");
    }

    return {
      titular: {
        clicod: titular.clicod,
        sumnro: titular.sumnro,
        cliape: titular.cliape,
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
