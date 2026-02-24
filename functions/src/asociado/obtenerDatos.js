const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.obtenerDatosAsociado = onCall(
  {
    region: "us-east1",
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

    // Llamar a la API de CELTA (proxy seguro — nunca exponer al frontend)
    let titular, adheridos;
    try {
      const [resTitular, resAdheridos] = await Promise.all([
        fetch(`${process.env.API_CELTA_URL}/titular?dni=${dni}`, {
          headers: { Authorization: `Bearer ${process.env.API_CELTA_TOKEN}` },
        }),
        fetch(`${process.env.API_CELTA_URL}/adheridos?dni=${dni}`, {
          headers: { Authorization: `Bearer ${process.env.API_CELTA_TOKEN}` },
        }),
      ]);

      if (!resTitular.ok) throw new Error("Error al obtener titular");
      titular   = await resTitular.json();
      adheridos = resAdheridos.ok ? await resAdheridos.json() : [];
    } catch (e) {
      throw new HttpsError("internal", "Error al consultar el sistema de CELTA");
    }

    // Devolver solo los campos necesarios
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
