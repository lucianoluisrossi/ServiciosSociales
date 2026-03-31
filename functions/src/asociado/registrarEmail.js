const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.registrarEmailAsociado = onCall(
  {
    region: "us-east1",
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
    ],
  },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || reqAuth.token.rol !== "asociado") {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { email } = data;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new HttpsError("invalid-argument", "Email inválido");
    }

    const dni = reqAuth.token.dni;
    await db.collection("cuentas_asociados").doc(String(dni)).update({
      "canales.email": {
        valor:        email.trim().toLowerCase(),
        verificado:   false,
        registradoEn: FieldValue.serverTimestamp(),
      },
    });

    return { ok: true };
  }
);
