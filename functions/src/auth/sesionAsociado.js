// v2 — solo email, sin WhatsApp
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");
const { Resend } = require("resend");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const db = getFirestore();

// ─── helper: enviar OTP por email ──────────────────────────────────────────
async function enviarOTP(destino, otp) {
  const resend = new Resend(RESEND_API_KEY.value());
  console.log(`[enviarOTP] Intentando enviar a: ${destino}`);
  const result = await resend.emails.send({
    from: "CELTA Sepelios <noreply@celta.com.ar>", // ← actualizado
    to: destino,
    subject: "Tu código de acceso — CELTA Sepelios",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem">
        <h2 style="color:#1e40af">CELTA Sepelios</h2>
        <p>Tu código de verificación es:</p>
        <div style="font-size:2rem;font-weight:700;letter-spacing:8px;color:#1e40af;
          padding:1rem;background:#eff6ff;border-radius:8px;text-align:center">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:.85rem;margin-top:1rem">
          Válido por 10 minutos. No lo compartas con nadie.
        </p>
      </div>
    `,
  });
  console.log(`[enviarOTP] Resultado Resend:`, JSON.stringify(result));
}

// ─── PASO 1: Iniciar sesión ─────────────────────────────────────────────────
exports.iniciarSesionAsociado = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
    ],
  },
  async ({ data }) => {
    const { dni } = data;
    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }

    const snap = await db.collection("cuentas_asociados").doc(String(dni)).get();
    if (!snap.exists || snap.data().estado !== "activa") {
      throw new HttpsError(
        "not-found",
        "No encontramos una cuenta activa para ese DNI. " +
          "Acercate a nuestras oficinas para activar tu acceso."
      );
    }

    const canales = snap.data().canales ?? {};
    const emailValor = canales.email?.valor;
    if (!emailValor) {
      throw new HttpsError(
        "failed-precondition",
        "No hay email registrado. Acercate a nuestras oficinas."
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await db.collection("cuentas_asociados").doc(String(dni)).update({
      "otpSesion.hash":     otpHash,
      "otpSesion.expira":   Date.now() + 10 * 60 * 1000,
      "otpSesion.intentos": 0,
    });

    await enviarOTP(emailValor, otp);

    const canalMask = emailValor.replace(/(.{2}).+(@.+)/, "$1***$2");
    return { canalMask };
  }
);

// ─── PASO 2: Verificar OTP y emitir Custom Token ────────────────────────────
exports.verificarOTPAsociado = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
    ],
  },
  async ({ data }) => {
    const { dni, otp } = data;

    const snap = await db.collection("cuentas_asociados").doc(String(dni)).get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Cuenta no encontrada");
    }

    const { otpSesion } = snap.data();
    console.log(`[verificarOTP] dni: ${dni}, otpSesion:`, JSON.stringify(otpSesion));

    if (!otpSesion) {
      throw new HttpsError(
        "failed-precondition",
        "No hay sesión iniciada. Volvé a ingresar tu DNI."
      );
    }
    if (otpSesion.intentos >= 3) {
      throw new HttpsError(
        "resource-exhausted",
        "Demasiados intentos. Volvé a ingresar tu DNI."
      );
    }
    if (Date.now() > otpSesion.expira) {
      throw new HttpsError(
        "deadline-exceeded",
        "El código expiró. Volvé a ingresar tu DNI."
      );
    }

    const otpHash = crypto.createHash("sha256").update(String(otp)).digest("hex");
    console.log(`[verificarOTP] hashRecibido: ${otpHash}, hashGuardado: ${otpSesion.hash}`);

    if (otpHash !== otpSesion.hash) {
      await db.collection("cuentas_asociados").doc(String(dni)).update({
        "otpSesion.intentos": otpSesion.intentos + 1,
      });
      const restantes = 2 - otpSesion.intentos;
      throw new HttpsError(
        "unauthenticated",
        `Código incorrecto. Intentos restantes: ${restantes}`
      );
    }

    await db.collection("cuentas_asociados").doc(String(dni)).update({
      otpSesion:    FieldValue.delete(),
      ultimoAcceso: FieldValue.serverTimestamp(),
    });

    const customToken = await getAuth().createCustomToken(
      `asociado_${dni}`,
      { rol: "asociado", dni: String(dni) }
    );
    return { customToken };
  }
);
