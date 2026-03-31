const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret }       = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const twilio = require("twilio");

// Todos los defineSecret deben estar al nivel superior del módulo
const TWILIO_ACCOUNT_SID = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN  = defineSecret("TWILIO_AUTH_TOKEN");
const API_CELTA_TOKEN    = defineSecret("API_CELTA_TOKEN");
const API_CELTA_URL      = defineSecret("API_CELTA_URL");

const db = getFirestore();

const CORS = [
  "https://celta-sepelios.vercel.app",
  "http://localhost:5174",
];

const SECRETS = [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, API_CELTA_TOKEN, API_CELTA_URL];

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizarTelefono(raw) {
  const digits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits))          return "+549" + digits;
  if (/^0\d{10}$/.test(digits))         return "+549" + digits.slice(1);
  if (/^9\d{10}$/.test(digits))         return "+54"  + digits;
  if (/^549\d{10}$/.test(digits))       return "+"    + digits;
  if (/^54\d{10}$/.test(digits))        return "+549" + digits.slice(2);
  return null;
}

function maskTelefono(telefono) {
  return telefono.slice(0, 4) + " ****" + telefono.slice(-4);
}

async function enviarOTPSMS(telefono, otp, apellido) {
  const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
  await client.messages.create({
    body: `Estimado/a ${apellido}, su código de activación CELTA Sepelios es: ${otp}. Válido por 15 minutos.`,
    from: "CELTA",
    to: telefono,
  });
}

// ─── Buscar asociado para activar ────────────────────────────────────────────
exports.buscarAsociadoParaActivar = onCall(
  { region: "us-east1", cors: CORS, secrets: [API_CELTA_TOKEN, API_CELTA_URL] },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni } = data;
    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }

    let titular;
    try {
      const res = await fetch(
        `${API_CELTA_URL.value()}/titular?dni=${dni}`,
        { headers: { Authorization: `Bearer ${API_CELTA_TOKEN.value()}` } }
      );
      if (!res.ok) throw new Error();
      titular = await res.json();
    } catch {
      throw new HttpsError("not-found", "DNI no encontrado en el sistema");
    }

    const snap = await db.collection("cuentas_asociados").doc(String(dni)).get();
    const estadoCuenta = snap.exists ? snap.data().estado : "no_activada";
    const canales      = snap.exists ? snap.data().canales : null;

    return {
      titular: { clicod: titular.clicod, sumnro: titular.sumnro, cliape: titular.cliape },
      estadoCuenta,
      canales,
    };
  }
);

// ─── Activar cuenta ──────────────────────────────────────────────────────────
exports.activarCuenta = onCall(
  { region: "us-east1", cors: CORS, secrets: SECRETS },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni, telefono, metodo } = data;

    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }
    const telefonoNorm = normalizarTelefono(String(telefono ?? ""));
    if (!telefonoNorm) {
      throw new HttpsError("invalid-argument", "Número de celular inválido");
    }
    if (!["presencial", "telefonica", "campania"].includes(metodo)) {
      throw new HttpsError("invalid-argument", "Método de activación inválido");
    }

    let titular;
    try {
      const res = await fetch(
        `${API_CELTA_URL.value()}/titular?dni=${dni}`,
        { headers: { Authorization: `Bearer ${API_CELTA_TOKEN.value()}` } }
      );
      if (!res.ok) throw new Error();
      titular = await res.json();
    } catch {
      throw new HttpsError("not-found", "DNI no encontrado en el sistema");
    }

    const cuentaRef = db.collection("cuentas_asociados").doc(String(dni));
    const snap      = await cuentaRef.get();
    if (snap.exists && snap.data().estado === "activa") {
      throw new HttpsError("already-exists", "Este asociado ya tiene cuenta activa");
    }

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await cuentaRef.set({
      estado:           "pendiente_confirmacion",
      metodoActivacion: metodo,
      activadoPor:      reqAuth.uid,
      creadoEn:         FieldValue.serverTimestamp(),
      canales: {
        telefono: { valor: telefonoNorm, verificado: false },
      },
      otpActivacion: { hash: otpHash, expira: Date.now() + 15 * 60 * 1000, intentos: 0 },
    });

    await db.collection("auditoria").add({
      tipo:        "activacion_iniciada",
      dni:         String(dni),
      clicod:      titular.clicod,
      empleadoUid: reqAuth.uid,
      metodo,
      timestamp:   FieldValue.serverTimestamp(),
      detalle:     `Activación iniciada vía ${metodo}`,
    });

    await enviarOTPSMS(telefonoNorm, otp, titular.cliape);

    return {
      ok:        true,
      canalMask: maskTelefono(telefonoNorm),
      titular:   { cliape: titular.cliape, clicod: titular.clicod },
    };
  }
);

// ─── Confirmar activación ─────────────────────────────────────────────────────
exports.confirmarActivacion = onCall(
  { region: "us-east1", cors: CORS, secrets: SECRETS },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni, otp } = data;
    const cuentaRef    = db.collection("cuentas_asociados").doc(String(dni));
    const snap         = await cuentaRef.get();

    if (!snap.exists) throw new HttpsError("not-found", "Cuenta no encontrada");

    const datos = snap.data();
    if (datos.estado !== "pendiente_confirmacion") {
      throw new HttpsError("failed-precondition", "La cuenta no está pendiente de confirmación");
    }

    const { hash, expira, intentos } = datos.otpActivacion;

    if (intentos >= 3) {
      await cuentaRef.update({ estado: "bloqueada_otp" });
      throw new HttpsError("resource-exhausted", "Demasiados intentos. Reiniciar activación.");
    }
    if (Date.now() > expira) {
      throw new HttpsError("deadline-exceeded", "Código expirado. Reiniciar activación.");
    }

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    if (otpHash !== hash) {
      await cuentaRef.update({ "otpActivacion.intentos": intentos + 1 });
      throw new HttpsError("unauthenticated", `Código incorrecto. Intentos restantes: ${2 - intentos}`);
    }

    const canalesVerificados = {};
    for (const tipo of Object.keys(datos.canales)) {
      canalesVerificados[`canales.${tipo}.verificado`]   = true;
      canalesVerificados[`canales.${tipo}.verificadoEn`] = FieldValue.serverTimestamp();
    }

    await cuentaRef.update({
      estado:        "activa",
      activadoEn:    FieldValue.serverTimestamp(),
      otpActivacion: FieldValue.delete(),
      ...canalesVerificados,
    });

    await db.collection("auditoria").add({
      tipo:        "activacion_completada",
      dni:         String(dni),
      empleadoUid: reqAuth.uid,
      timestamp:   FieldValue.serverTimestamp(),
      detalle:     "Cuenta activada exitosamente",
    });

    return { ok: true };
  }
);
