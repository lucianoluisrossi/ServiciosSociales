const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret }       = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");
const { Resend } = require("resend");

// Declarar secretos explícitamente para Functions v2
const RESEND_API_KEY  = defineSecret("RESEND_API_KEY");
const WA_PHONE_ID     = defineSecret("WA_PHONE_ID");
const WA_TOKEN        = defineSecret("WA_TOKEN");
const API_CELTA_TOKEN = defineSecret("API_CELTA_TOKEN");
const API_CELTA_URL   = defineSecret("API_CELTA_URL");

const db = getFirestore();

const CORS = [
  "https://celta-sepelios.vercel.app",
  "http://localhost:5174",
];

const SECRETS = [RESEND_API_KEY, WA_PHONE_ID, WA_TOKEN, API_CELTA_TOKEN, API_CELTA_URL];

// ─── helpers ────────────────────────────────────────────────────

function enmascararCanal(valor, tipo) {
  if (tipo === "email") return valor.replace(/(.{2}).+(@.+)/, "$1***$2");
  return valor.slice(0, -4).replace(/\d/g, "*") + valor.slice(-4);
}

async function enviarOTP(destino, tipo, otp, apellido) {
  if (tipo === "email") {
    const resend = new Resend(RESEND_API_KEY.value());
    await resend.emails.send({
      from: "CELTA Sepelios <noreply@celta.com.ar>",
      to: destino,
      subject: "Código de activación — CELTA Sepelios",
      html: `
        <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem">
          <h2 style="color:#1e40af">CELTA Sepelios</h2>
          <p>Estimado/a <strong>${apellido}</strong>,</p>
          <p>Su código de activación es:</p>
          <div style="font-size:2rem;font-weight:700;letter-spacing:8px;color:#1e40af;padding:1rem;background:#eff6ff;border-radius:8px;text-align:center">
            ${otp}
          </div>
          <p style="color:#6b7280;font-size:.85rem;margin-top:1rem">
            Válido por 15 minutos. No lo comparta con nadie.
          </p>
        </div>
      `,
    });
  } else {
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
            body: `CELTA: Su código de activación es *${otp}*. Válido 15 minutos. No lo comparta.`,
          },
        }),
      }
    );
  }
}

// ─── Buscar asociado para activar ───────────────────────────────
exports.buscarAsociadoParaActivar = onCall(
  { region: "us-east1", cors: CORS, secrets: SECRETS },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni } = data;
    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }

    // Consultar API de CELTA
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
    const canales = snap.exists ? snap.data().canales : null;

    return {
      titular: {
        clicod: titular.clicod,
        sumnro: titular.sumnro,
        cliape: titular.cliape,
      },
      estadoCuenta,
      canales,
    };
  }
);

// ─── Activar cuenta ──────────────────────────────────────────────
exports.activarCuenta = onCall(
  { region: "us-east1", cors: CORS, secrets: SECRETS },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni, email, celular, metodo } = data;

    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }
    if (!email && !celular) {
      throw new HttpsError("invalid-argument", "Se requiere al menos un canal de contacto");
    }
    if (!["presencial", "telefonica", "campania"].includes(metodo)) {
      throw new HttpsError("invalid-argument", "Método de activación inválido");
    }

    // Verificar DNI en API de CELTA
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

    // Verificar que no tenga cuenta activa
    const cuentaRef = db.collection("cuentas_asociados").doc(String(dni));
    const snap = await cuentaRef.get();
    if (snap.exists && snap.data().estado === "activa") {
      throw new HttpsError("already-exists", "Este asociado ya tiene cuenta activa");
    }

    // Generar OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await cuentaRef.set({
      estado: "pendiente_confirmacion",
      metodoActivacion: metodo,
      activadoPor: reqAuth.uid,
      creadoEn: FieldValue.serverTimestamp(),
      canales: {
        ...(email   && { email:   { valor: email,   verificado: false } }),
        ...(celular && { celular: { valor: celular, verificado: false } }),
      },
      otpActivacion: { hash: otpHash, expira: Date.now() + 15 * 60 * 1000, intentos: 0 },
    });

    await db.collection("auditoria").add({
      tipo: "activacion_iniciada",
      dni: String(dni),
      clicod: titular.clicod,
      empleadoUid: reqAuth.uid,
      metodo,
      timestamp: FieldValue.serverTimestamp(),
      detalle: `Activación iniciada vía ${metodo}`,
    });

    const canalEnvio = email || celular;
    const tipoCanal  = email ? "email" : "whatsapp";
    await enviarOTP(canalEnvio, tipoCanal, otp, titular.cliape);

    return {
      ok: true,
      canalMask: enmascararCanal(canalEnvio, tipoCanal),
      titular: { cliape: titular.cliape, clicod: titular.clicod },
    };
  }
);

// ─── Confirmar activación ────────────────────────────────────────
exports.confirmarActivacion = onCall(
  { region: "us-east1", cors: CORS, secrets: SECRETS },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { dni, otp } = data;
    const cuentaRef = db.collection("cuentas_asociados").doc(String(dni));
    const snap = await cuentaRef.get();

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
      estado: "activa",
      activadoEn: FieldValue.serverTimestamp(),
      otpActivacion: FieldValue.delete(),
      ...canalesVerificados,
    });

    await db.collection("auditoria").add({
      tipo: "activacion_completada",
      dni: String(dni),
      empleadoUid: reqAuth.uid,
      timestamp: FieldValue.serverTimestamp(),
      detalle: "Cuenta activada exitosamente",
    });

    return { ok: true };
  }
);
