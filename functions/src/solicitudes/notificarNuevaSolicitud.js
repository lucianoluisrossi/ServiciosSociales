const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret }      = require("firebase-functions/params");
const { getFirestore }      = require("firebase-admin/firestore");
const { Resend }            = require("resend");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const PANEL_URL      = defineSecret("PANEL_URL");

const db = getFirestore();

exports.notificarNuevaSolicitud = onDocumentCreated(
  {
    document: "solicitudes/{solicitudId}",
    region:   "us-east1",
    secrets:  [RESEND_API_KEY, PANEL_URL],
  },
  async (event) => {
    const { titularDni, clicod, sumnro, cambios } = event.data.data();
    const solicitudId = event.params.solicitudId;

    const empleadosSnap = await db
      .collection("usuarios_internos")
      .where("activo", "==", true)
      .get();

    const emails = empleadosSnap.docs
      .map((d) => d.data().email)
      .filter(Boolean);

    if (emails.length === 0) return;

    const iconos = { agregar: "➕", editar: "✏️", eliminar: "🗑️" };
    const resumenHTML = cambios
      .map((c) => {
        const nombre = c.datosNuevos?.CliApeContrato ?? `ID: ${c.adheridoId}`;
        return `<li>${iconos[c.tipo] ?? "•"} <strong>${c.tipo.toUpperCase()}</strong>: ${nombre}</li>`;
      })
      .join("");

    const panelUrl = PANEL_URL.value() ?? "https://celta-panel.vercel.app";

    const resend = new Resend(RESEND_API_KEY.value());
    await resend.emails.send({
      from:    "Sistema CELTA <sistema@celta.com.ar>",
      to:      emails,
      subject: `[Nueva solicitud] Cód. cliente ${clicod} — ${cambios.length} cambio(s)`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem">
          <h2 style="color:#1e40af">Nueva solicitud de modificación</h2>
          <table style="width:100%;border-collapse:collapse;margin:1rem 0">
            <tr><td style="padding:.4rem;color:#6b7280">Cód. cliente</td><td><strong>${clicod}</strong></td></tr>
            <tr><td style="padding:.4rem;color:#6b7280">Suministro</td><td>${sumnro}</td></tr>
            <tr><td style="padding:.4rem;color:#6b7280">Cambios</td><td>${cambios.length}</td></tr>
          </table>
          <ul style="padding-left:1.5rem;line-height:2">${resumenHTML}</ul>
          <a href="${panelUrl}/solicitudes/${solicitudId}"
             style="display:inline-block;margin-top:1.5rem;padding:.75rem 1.5rem;background:#1e40af;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Ver solicitud en el panel →
          </a>
          <p style="color:#6b7280;font-size:.8rem;margin-top:2rem">
            Mensaje automático del sistema CELTA.
          </p>
        </div>
      `,
    });
  }
);
