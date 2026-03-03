const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");
const { Resend } = require("resend");

// Declarar secretos explícitamente para Functions v2
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const WA_PHONE_ID   = defineSecret("WA_PHONE_ID");
const WA_TOKEN      = defineSecret("WA_TOKEN");

const db = getFirestore();

// ─── helpers ────────────────────────────────────────────────────

function enmascararCanal(valor, tipo) {
  if (tipo === "email") return valor.replace(/(.{2}).+(@.+)/, "$1***$2");
  return valor.slice(0, -4).replace(/\d/g, "*") + valor.slice(-4);
}

async function enviarOTP(destino, tipo, otp) {
  if (tipo === "email") {
    const resend = new Resend(RESEND_API_KEY.value());
    await resend.emails.send({
      from: "CELTA Sepelios <noreply@celta.com.ar>",
      to: destino,
      subject: "Tu código de acceso — CELTA Sepelios",
      text: `Tu código de verificación es: ${otp}\n\nVálido por 10 minutos. No lo compartas.\n\nCELTA Servicios Sociales`,
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem">
          <h2 style="color:#1e40af">CELTA Sepelios</h2>
          <p>Tu código de verificación es:</p>
          <div style="font-size:2rem;font-weight:700;letter-spacing:8px;color:#1e40af;padding:1rem;background:#eff6ff;border-radius:8px;text-align:center">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:.85rem;margin-top:1rem">
            Válido por 10 minutos. No lo compartas con nadie.
          </p>
        </div>
      `,
    });
  } else {
    // WhatsApp Business API
    await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID.value()}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WA_TOKEN.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: destino.replace(/\D/g, ""),
          type: "text",
          text: {
            body: `CELTA Sepelios: Tu código de acceso es *${otp}*. Válido 10 minutos. No lo compartas.`,
          },
        }),
      }
    );
  }
}

// ─── PASO 1: Iniciar sesión ──────────────────────────────────────
exports.iniciarSesionAsociado = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY, WA_PHONE_ID, WA_TOKEN],
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

    // Verificar cuenta activa en Firestore
    const snap = await db.collection("cuentas_asociados").doc(String(dni)).get();

    if (!snap.exists || snap.data().estado !== "activa") {
      throw new HttpsError(
        "not-found",
        "No encontramos una cuenta activa para ese DNI. " +
          "Acercate a nuestras oficinas para activar tu acceso."
      );
    }

    const cuenta = snap.data();

    // Elegir canal: email primero, WhatsApp como fallback
    const canales = cuenta.canales ?? {};
    let canal;

    if (canales.email?.valor) {
      canal = { tipo: "email", valor: canales.email.valor };
    } else if (canales.celular?.valor) {
      canal = { tipo: "whatsapp", valor: canales.celular.valor };
    } else {
      throw new HttpsError(
        "failed-precondition",
        "No hay canal de contacto registrado. Acercate a nuestras oficinas."
      );
    }

    // Generar OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Guardar OTP en Firestore (hasheado, nunca en texto plano)
    await db.collection("cuentas_asociados").doc(String(dni)).update({
      "otpSesion.hash": otpHash,
      "otpSesion.expira": Date.now() + 10 * 60 * 1000, // 10 minutos
      "otpSesion.intentos": 0,
    });

    // Enviar OTP
    await enviarOTP(canal.valor, canal.tipo, otp);

    return { canalMask: enmascararCanal(canal.valor, canal.tipo) };
  }
);

// ─── PASO 2: Verificar OTP y emitir Custom Token ─────────────────
exports.verificarOTPAsociado = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY, WA_PHONE_ID, WA_TOKEN],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
    ],
  },
  async ({ data }) => {
    const { dni, otp } = data;

    const snap = await db
      .collection("cuentas_asociados")
      .doc(String(dni))
      .get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Cuenta no encontrada");
    }

    const { otpSesion } = snap.data();

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

    if (otpHash !== otpSesion.hash) {
      await db
        .collection("cuentas_asociados")
        .doc(String(dni))
        .update({ "otpSesion.intentos": otpSesion.intentos + 1 });

      const restantes = 2 - otpSesion.intentos;
      throw new HttpsError(
        "unauthenticated",
        `Código incorrecto. Intentos restantes: ${restantes}`
      );
    }

    // OTP correcto: limpiar y emitir Custom Token
    await db
      .collection("cuentas_asociados")
      .doc(String(dni))
      .update({
        otpSesion: FieldValue.delete(),
        ultimoAcceso: FieldValue.serverTimestamp(),
      });

    const customToken = await getAuth().createCustomToken(
      `asociado_${dni}`,
      { rol: "asociado", dni: String(dni) }
    );

    return { customToken };
  }
);

// redeploy 03/03/2026 07:46:09
