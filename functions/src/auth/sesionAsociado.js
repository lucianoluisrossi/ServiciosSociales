// v3 — SMS via Twilio (sin email)
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");
const twilio = require("twilio");

const TWILIO_ACCOUNT_SID  = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN   = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = defineSecret("TWILIO_PHONE_NUMBER");
const API_CELTA_TOKEN     = defineSecret("API_CELTA_TOKEN");
const API_CELTA_URL       = defineSecret("API_CELTA_URL");

const db = getFirestore();

const CORS = [
  "https://celta-sepelios.vercel.app",
  "http://localhost:5173",
];

const SECRETS = [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, API_CELTA_TOKEN, API_CELTA_URL];

// ─── helper: normalizar teléfono argentino a E.164 ────────────────────────────
// Acepta formatos locales: 1155551234, 01155551234, 91155551234, 5491155551234
// Devuelve +549XXXXXXXXXX o null si el formato no es reconocible
function normalizarTelefono(raw) {
  const digits = raw.replace(/\D/g, "");
  if (/^\d{10}$/.test(digits))                       return "+549" + digits;
  if (/^0\d{10}$/.test(digits))                      return "+549" + digits.slice(1);
  if (/^9\d{10}$/.test(digits))                      return "+54"  + digits;
  if (/^549\d{10}$/.test(digits))                    return "+"    + digits;
  if (/^54\d{10}$/.test(digits))                     return "+549" + digits.slice(2);
  return null;
}

// ─── helper: enmascarar teléfono ─────────────────────────────────────────────
// +5491155551234 → +549 ****1234
function maskTelefono(telefono) {
  return telefono.slice(0, 4) + " ****" + telefono.slice(-4);
}

// ─── helper: enviar OTP por SMS ───────────────────────────────────────────────
async function enviarOTPSMS(telefono, otp) {
  const client = twilio(TWILIO_ACCOUNT_SID.value(), TWILIO_AUTH_TOKEN.value());
  await client.messages.create({
    body: `Tu código de acceso CELTA Sepelios: ${otp}. Válido por 10 minutos. No lo compartas.\n@celta-sepelios.vercel.app #${otp}`,
    from: TWILIO_PHONE_NUMBER.value(),
    to: telefono,
  });
}

// ─── helper: generar y guardar OTP ────────────────────────────────────────────
function generarOTP() {
  const otp    = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  return { otp, otpHash };
}

// ─── PASO 1: Iniciar sesión ───────────────────────────────────────────────────
exports.iniciarSesionAsociado = onCall(
  { region: "us-east1", secrets: SECRETS, cors: CORS },
  async ({ data }) => {
    const { dni } = data;
    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }

    let snap = await db.collection("cuentas_asociados").doc(String(dni)).get();

    // Si no existe en Firestore, verificar en la API de CELTA y crear automáticamente
    if (!snap.exists) {
      let titular;
      try {
        const res = await fetch(
          `${API_CELTA_URL.value()}${dni}`,
          { headers: { "X-Api-Key": API_CELTA_TOKEN.value() } }
        );
        if (!res.ok) throw new Error();
        titular = await res.json();
      } catch {
        throw new HttpsError(
          "not-found",
          "No encontramos una cuenta para ese DNI. " +
            "Verificá que el número sea correcto o acercate a nuestras oficinas."
        );
      }

      await db.collection("cuentas_asociados").doc(String(dni)).set({
        estado:           "activa",
        metodoActivacion: "autoregistro",
        clicod:           titular.clicod ?? null,
        canales:          {},
        creadoEn:         FieldValue.serverTimestamp(),
      });

      // Recargar el documento recién creado
      snap = await db.collection("cuentas_asociados").doc(String(dni)).get();
    }

    if (snap.data().estado !== "activa") {
      throw new HttpsError(
        "failed-precondition",
        "Tu cuenta no está activa. Acercate a nuestras oficinas."
      );
    }

    const telefonoValor = snap.data().canales?.telefono?.valor;

    if (!telefonoValor) {
      // No tiene teléfono registrado: el frontend muestra el paso de registro
      return { necesitaTelefono: true };
    }

    const { otp, otpHash } = generarOTP();

    await db.collection("cuentas_asociados").doc(String(dni)).update({
      "otpSesion.hash":     otpHash,
      "otpSesion.expira":   Date.now() + 10 * 60 * 1000,
      "otpSesion.intentos": 0,
    });

    await enviarOTPSMS(telefonoValor, otp);

    return { canalMask: maskTelefono(telefonoValor) };
  }
);

// ─── PASO 1b: Registrar teléfono nuevo y enviar OTP ──────────────────────────
exports.registrarTelefonoYEnviarOTP = onCall(
  { region: "us-east1", secrets: SECRETS, cors: CORS },
  async ({ data }) => {
    const { dni, telefono } = data;

    if (!dni || !/^\d{7,8}$/.test(String(dni))) {
      throw new HttpsError("invalid-argument", "DNI inválido");
    }

    const telefonoNorm = normalizarTelefono(String(telefono ?? ""));
    if (!telefonoNorm) {
      throw new HttpsError(
        "invalid-argument",
        "Número de celular inválido. Ingresá 10 dígitos sin el 0 ni el 15 (ej: 1155551234)."
      );
    }

    const snap = await db.collection("cuentas_asociados").doc(String(dni)).get();
    if (!snap.exists || snap.data().estado !== "activa") {
      throw new HttpsError("not-found", "Cuenta no encontrada");
    }

    // Si ya tiene teléfono registrado, no permitir sobreescribirlo por esta vía
    if (snap.data().canales?.telefono?.valor) {
      throw new HttpsError(
        "failed-precondition",
        "Ya hay un teléfono registrado. Usá el flujo normal de ingreso."
      );
    }

    const { otp, otpHash } = generarOTP();

    // Guardar OTP y teléfono pendiente juntos — se persiste en canales al verificar
    await db.collection("cuentas_asociados").doc(String(dni)).update({
      "otpSesion.hash":              otpHash,
      "otpSesion.expira":            Date.now() + 10 * 60 * 1000,
      "otpSesion.intentos":          0,
      "otpSesion.telefonoPendiente": telefonoNorm,
    });

    await enviarOTPSMS(telefonoNorm, otp);

    return { canalMask: maskTelefono(telefonoNorm) };
  }
);

// ─── PASO 2: Verificar OTP y emitir Custom Token ──────────────────────────────
exports.verificarOTPAsociado = onCall(
  { region: "us-east1", secrets: SECRETS, cors: CORS },
  async ({ data }) => {
    const { dni, otp } = data;

    const snap = await db.collection("cuentas_asociados").doc(String(dni)).get();
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
      await db.collection("cuentas_asociados").doc(String(dni)).update({
        "otpSesion.intentos": otpSesion.intentos + 1,
      });
      const restantes = 2 - otpSesion.intentos;
      throw new HttpsError(
        "unauthenticated",
        `Código incorrecto. Intentos restantes: ${restantes}`
      );
    }

    // OTP correcto — construir updates
    const updates = {
      otpSesion:    FieldValue.delete(),
      ultimoAcceso: FieldValue.serverTimestamp(),
    };

    // Si hay teléfono pendiente de registrar, persistirlo en canales
    if (otpSesion.telefonoPendiente) {
      updates["canales.telefono"] = {
        valor:        otpSesion.telefonoPendiente,
        verificado:   true,
        verificadoEn: FieldValue.serverTimestamp(),
      };
    }

    await db.collection("cuentas_asociados").doc(String(dni)).update(updates);

    const customToken = await getAuth().createCustomToken(
      `asociado_${dni}`,
      { rol: "asociado", dni: String(dni) }
    );
    return { customToken };
  }
);
