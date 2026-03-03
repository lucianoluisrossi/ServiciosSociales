const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret }       = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Resend } = require("resend");

const RESEND_API_KEY   = defineSecret("RESEND_API_KEY");
const EMAIL_BACKOFFICE = defineSecret("EMAIL_BACKOFFICE");
const PANEL_URL        = defineSecret("PANEL_URL");

const db = getFirestore();

exports.resolverSolicitud = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY, EMAIL_BACKOFFICE, PANEL_URL],
    cors: [
      "https://celta-sepelios.vercel.app",
      "http://localhost:5174",
    ],
  },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { solicitudId, accion, motivo } = data;

    if (!["aprobado", "rechazado"].includes(accion)) {
      throw new HttpsError("invalid-argument", "Acción inválida");
    }
    if (accion === "rechazado" && !motivo?.trim()) {
      throw new HttpsError("invalid-argument", "El motivo de rechazo es obligatorio");
    }

    const solicitudRef = db.collection("solicitudes").doc(solicitudId);
    const snap = await solicitudRef.get();

    if (!snap.exists) throw new HttpsError("not-found", "Solicitud no encontrada");
    if (snap.data().estado !== "pendiente") {
      throw new HttpsError("failed-precondition", "La solicitud ya fue resuelta");
    }

    const { titularDni, clicod, cambios } = snap.data();

    await solicitudRef.update({
      estado:        accion,
      revisadoPor:   reqAuth.uid,
      motivoRechazo: accion === "rechazado" ? motivo.trim() : null,
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    await db.collection("auditoria").add({
      tipo:        `solicitud_${accion}`,
      solicitudId,
      titularDni,
      clicod,
      empleadoUid: reqAuth.uid,
      timestamp:   FieldValue.serverTimestamp(),
      detalle:     accion === "aprobado"
        ? "Solicitud aprobada por empleado"
        : `Solicitud rechazada: ${motivo}`,
    });

    // Notificar al asociado si tiene email
    const cuentaSnap = await db.collection("cuentas_asociados").doc(titularDni).get();
    const email = cuentaSnap.data()?.canales?.email?.valor;

    if (email) {
      const resend = new Resend(RESEND_API_KEY.value());
      const aprobado = accion === "aprobado";
      await resend.emails.send({
        from:    "CELTA Sepelios <noreply@celta.com.ar>",
        to:      email,
        subject: aprobado
          ? "Tu solicitud fue aprobada — CELTA Sepelios"
          : "Tu solicitud fue observada — CELTA Sepelios",
        html: aprobado
          ? `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem">
               <h2 style="color:#1e40af">CELTA Sepelios</h2>
               <p>Tu solicitud (cód. cliente: <strong>${clicod}</strong>)
               fue <strong style="color:#16a34a">aprobada</strong>.</p>
               <p>Los cambios serán procesados en el sistema.</p>
               <p style="color:#6b7280;font-size:.85rem">CELTA Servicios Sociales</p>
             </div>`
          : `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem">
               <h2 style="color:#1e40af">CELTA Sepelios</h2>
               <p>Tu solicitud (cód. cliente: <strong>${clicod}</strong>)
               fue <strong style="color:#dc2626">observada</strong>.</p>
               <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:.75rem 1rem;border-radius:4px;margin:1rem 0">
                 <strong>Motivo:</strong> ${motivo}
               </div>
               <p>Podés ingresar nuevamente a la app para realizar los ajustes necesarios.</p>
               <p style="color:#6b7280;font-size:.85rem">CELTA Servicios Sociales</p>
             </div>`,
      });
    }

    // Notificar al back-office si fue aprobado
    if (accion === "aprobado") {
      const resend = new Resend(RESEND_API_KEY.value());
      await resend.emails.send({
        from:    "Sistema CELTA <sistema@celta.com.ar>",
        to:      EMAIL_BACKOFFICE.value(),
        subject: `[ACCIÓN REQUERIDA] Solicitud aprobada — Cód. cliente ${clicod}`,
        text:
          `Se aprobó la solicitud ${solicitudId} para el cliente ${clicod}.\n\n` +
          `Cambios:\n${JSON.stringify(cambios, null, 2)}\n\n` +
          `Actualizar en el sistema legacy.`,
      });
    }

    return { ok: true };
  }
);
