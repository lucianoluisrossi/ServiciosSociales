const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

exports.crearCuenta = onCall(
  {
    region: "us-east1",
    cors: [
      "https://servicios-sociales-empleados.vercel.app",
      "http://localhost:5174",
    ],
  },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni, email } = data;

    if (!dni || !/^\d{7,8}$/.test(dni)) {
      throw new HttpsError("invalid-argument", "DNI inválido (7-8 dígitos)");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpsError("invalid-argument", "Email inválido");
    }

    const ref = db.collection("cuentas_asociados").doc(dni);
    const snap = await ref.get();

    if (snap.exists) {
      throw new HttpsError("already-exists", "Ya existe una cuenta para ese DNI");
    }

    await ref.set({
      estado:           "activa",
      metodoActivacion: "presencial",
      canales: {
        email: {
          valor:      email,
          verificado: true,
        },
      },
      ultimoAcceso: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  }
);