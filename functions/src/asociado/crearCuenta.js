const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

function normalizarTelefono(raw) {
  const digits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits))          return "+549" + digits;
  if (/^0\d{10}$/.test(digits))         return "+549" + digits.slice(1);
  if (/^9\d{10}$/.test(digits))         return "+54"  + digits;
  if (/^549\d{10}$/.test(digits))       return "+"    + digits;
  if (/^54\d{10}$/.test(digits))        return "+549" + digits.slice(2);
  return null;
}

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

    const { dni, telefono } = data;

    if (!dni || !/^\d{7,8}$/.test(dni)) {
      throw new HttpsError("invalid-argument", "DNI inválido (7-8 dígitos)");
    }
    const telefonoNorm = normalizarTelefono(String(telefono ?? ""));
    if (!telefonoNorm) {
      throw new HttpsError("invalid-argument", "Número de celular inválido");
    }

    const ref  = db.collection("cuentas_asociados").doc(dni);
    const snap = await ref.get();

    if (snap.exists) {
      throw new HttpsError("already-exists", "Ya existe una cuenta para ese DNI");
    }

    await ref.set({
      estado:           "activa",
      metodoActivacion: "presencial",
      canales: {
        telefono: {
          valor:      telefonoNorm,
          verificado: true,
        },
      },
      ultimoAcceso: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  }
);
