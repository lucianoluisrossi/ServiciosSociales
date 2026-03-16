const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Resend } = require("resend");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EMAIL_BACKOFFICE = defineSecret("EMAIL_BACKOFFICE");

const db = getFirestore();

exports.responderConfirmacionCosto = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY, EMAIL_BACKOFFICE],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5173",
    ],
    // Pública: no requiere autenticación Firebase (el token en el body es la auth)
  },
  async ({ data }) => {
    const { token, respuesta } = data;

    if (!token?.trim()) {
      throw new HttpsError("invalid-argument", "Token requerido");
    }
    if (!["aprobado", "rechazado"].includes(respuesta)) {
      throw new HttpsError("invalid-argument", "Respuesta inválida");
    }

    // Buscar la solicitud por token de confirmación
    const snap = await db
      .collection("solicitudes")
      .where("confirmacionCosto.token", "==", token.trim())
      .limit(1)
      .get();

    if (snap.empty) {
      throw new HttpsError("not-found", "Token inválido o ya utilizado");
    }

    const docRef = snap.docs[0].ref;
    const solicitud = snap.docs[0].data();
    const solicitudId = snap.docs[0].id;

    // Verificar que todavía esté pendiente de confirmación
    if (solicitud.confirmacionCosto?.estado !== "pendiente") {
      throw new HttpsError("failed-precondition", "Este link ya fue utilizado");
    }

    // Actualizar estado de confirmación
    await docRef.update({
      "confirmacionCosto.estado": respuesta,
      "confirmacionCosto.respondidoEn": FieldValue.serverTimestamp(),
      // Si rechaza el costo, la solicitud pasa a estado especial
      ...(respuesta === "rechazado"
        ? { estado: "costo_rechazado" }
        : {}),
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    await db.collection("auditoria").add({
      tipo: `confirmacion_costo_${respuesta}`,
      solicitudId,
      titularDni: solicitud.titularDni,
      clicod: solicitud.clicod,
      timestamp: FieldValue.serverTimestamp(),
      detalle: `Asociado ${respuesta} el costo mensual del servicio`,
    });

    // Si rechazó → notificar al backoffice por email
    if (respuesta === "rechazado") {
      const resend = new Resend(RESEND_API_KEY.value());

      const itemsTexto = (solicitud.confirmacionCosto?.itemsConCosto ?? [])
        .map((d) => `  - ${d.socNom ?? `DNI ${d.adheridoDni}`}: ${d.costoMensual}`)
        .join("\n");

      await resend.emails.send({
        from: "Sistema CELTA <sistema@celta.com.ar>",
        to: EMAIL_BACKOFFICE.value(),
        subject: `[ATENCIÓN] Asociado rechazó el costo — Cód. cliente ${solicitud.clicod}`,
        text:
          `El asociado con DNI ${solicitud.titularDni} (cód. cliente: ${solicitud.clicod}) ` +
          `RECHAZÓ el costo mensual del servicio para la solicitud ${solicitudId}.\n\n` +
          `Costos informados:\n${itemsTexto}\n\n` +
          `La solicitud quedó en estado "costo_rechazado". Revisar en el panel.`,
      });
    }

    return {
      ok: true,
      respuesta,
      clicod: solicitud.clicod,
    };
  }
);
