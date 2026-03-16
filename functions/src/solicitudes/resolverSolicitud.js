const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { Resend } = require("resend");
const crypto = require("crypto");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EMAIL_BACKOFFICE = defineSecret("EMAIL_BACKOFFICE");
const PANEL_URL = defineSecret("PANEL_URL");

const db = getFirestore();

exports.resolverSolicitud = onCall(
  {
    region: "us-east1",
    secrets: [RESEND_API_KEY, EMAIL_BACKOFFICE, PANEL_URL],
    cors: [
      "https://celta-sepelios.vercel.app",
      "https://servicios-sociales-empleados.vercel.app",
      "http://localhost:5174",
    ],
  },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { solicitudId, accion, motivo, datosAprobacion } = data;

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

    // Determinar si algún familiar agregado tiene costo mensual informado
    const itemsConCosto = (datosAprobacion ?? []).filter((d) => d.costoMensual);
    const requiereConfirmacion = accion === "aprobado" && itemsConCosto.length > 0;

    // Generar token de confirmación si hay costo
    let tokenConfirmacion = null;
    if (requiereConfirmacion) {
      tokenConfirmacion = crypto.randomUUID();
    }

    await solicitudRef.update({
      estado: accion,
      revisadoPor: reqAuth.uid,
      motivoRechazo: accion === "rechazado" ? motivo.trim() : null,
      datosAprobacion: accion === "aprobado" && datosAprobacion?.length ? datosAprobacion : null,
      // Confirmación de costo: solo se crea si hay costo informado
      confirmacionCosto: requiereConfirmacion
        ? {
            token: tokenConfirmacion,
            estado: "pendiente",      // pendiente | aprobado | rechazado
            itemsConCosto,
            creadoEn: FieldValue.serverTimestamp(),
            respondidoEn: null,
          }
        : null,
      actualizadoEn: FieldValue.serverTimestamp(),
    });

    await db.collection("auditoria").add({
      tipo: `solicitud_${accion}`,
      solicitudId,
      titularDni,
      clicod,
      empleadoUid: reqAuth.uid,
      timestamp: FieldValue.serverTimestamp(),
      detalle: accion === "aprobado"
        ? "Solicitud aprobada por empleado"
        : `Solicitud rechazada: ${motivo}`,
    });

    // --- Emails ---
    const cuentaSnap = await db.collection("cuentas_asociados").doc(titularDni).get();
    const email = cuentaSnap.data()?.canales?.email?.valor;

    if (email) {
      const resend = new Resend(RESEND_API_KEY.value());
      const aprobado = accion === "aprobado";

      if (aprobado) {
        // Construir sección de observaciones y costos para el email
        const hayObservaciones = (datosAprobacion ?? []).some((d) => d.observaciones);
        const linkConfirmacion = requiereConfirmacion
          ? `https://celta-sepelios.vercel.app/confirmar-costo?token=${tokenConfirmacion}`
          : null;

        // Sección de detalle por familiar (observaciones + costo)
        const detallesFamiliares = (datosAprobacion ?? [])
          .filter((d) => d.observaciones || d.costoMensual)
          .map((d) => `
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid #e5e7eb">
                <strong>${d.socNom ?? `DNI ${d.adheridoDni}`}</strong>
                ${d.observaciones ? `<br><span style="color:#6b7280;font-size:.85rem">Obs: ${d.observaciones}</span>` : ""}
                ${d.costoMensual ? `<br><span style="color:#1e40af;font-weight:600">Costo mensual: ${d.costoMensual}</span>` : ""}
              </td>
            </tr>`)
          .join("");

        const html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
            <h2 style="color:#1e40af">CELTA Sepelios</h2>
            <p>Tu solicitud (cód. cliente: <strong>${clicod}</strong>) fue
            <strong style="color:#16a34a">aprobada</strong>.</p>

            ${detallesFamiliares ? `
            <h3 style="font-size:1rem;color:#374151;margin-top:1.5rem">Detalle por familiar</h3>
            <table style="width:100%;border-collapse:collapse">
              <tbody>${detallesFamiliares}</tbody>
            </table>` : ""}

            ${linkConfirmacion ? `
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:1rem 1.25rem;margin-top:1.5rem">
              <p style="margin:0 0 .75rem;color:#1e40af;font-weight:600">⚠️ Se requiere su confirmación</p>
              <p style="margin:0 0 1rem;color:#374151;font-size:.9rem">
                El servicio tiene un costo mensual asociado. Para completar el alta, necesitamos que confirme su aceptación.
              </p>
              <a href="${linkConfirmacion}"
                 style="display:inline-block;background:#1e40af;color:#fff;padding:.65rem 1.25rem;border-radius:6px;text-decoration:none;font-weight:600;font-size:.9rem">
                ✓ Confirmar aceptación del costo
              </a>
              <p style="margin:.75rem 0 0;color:#6b7280;font-size:.8rem">
                Este link es de uso único y personal. No lo comparta.
              </p>
            </div>` : ""}

            <p style="color:#6b7280;font-size:.85rem;margin-top:1.5rem">CELTA Servicios Sociales</p>
          </div>`;

        await resend.emails.send({
          from: "CELTA Sepelios <noreply@celta.com.ar>",
          to: email,
          subject: requiereConfirmacion
            ? `Tu solicitud fue aprobada — se requiere confirmación de costo — CELTA Sepelios`
            : `Tu solicitud fue aprobada — CELTA Sepelios`,
          html,
        });
      } else {
        // Email de rechazo (sin cambios)
        await resend.emails.send({
          from: "CELTA Sepelios <noreply@celta.com.ar>",
          to: email,
          subject: "Tu solicitud fue observada — CELTA Sepelios",
          html: `
            <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:2rem">
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
    }

    // Email al backoffice si fue aprobado
    if (accion === "aprobado") {
      const resend = new Resend(RESEND_API_KEY.value());
      let textoAprobacion = "";
      if (datosAprobacion?.length) {
        textoAprobacion =
          "\nDatos de aprobación por familiar:\n" +
          datosAprobacion
            .map((d) => {
              const lineas = [`  Familiar: ${d.socNom ?? d.adheridoDni} (DNI ${d.adheridoDni})`];
              if (d.observaciones) lineas.push(`  Observaciones: ${d.observaciones}`);
              if (d.costoMensual) lineas.push(`  Costo mensual: ${d.costoMensual}`);
              return lineas.join("\n");
            })
            .join("\n\n") + "\n";
      }
      await resend.emails.send({
        from: "Sistema CELTA <sistema@celta.com.ar>",
        to: EMAIL_BACKOFFICE.value(),
        subject: `[ACCIÓN REQUERIDA] Solicitud aprobada — Cód. cliente ${clicod}`,
        text:
          `Se aprobó la solicitud ${solicitudId} para el cliente ${clicod}.\n\n` +
          `Cambios:\n${JSON.stringify(cambios, null, 2)}\n` +
          textoAprobacion +
          (requiereConfirmacion ? `\nNota: el asociado debe confirmar el costo mensual. Estado: pendiente.\n` : "") +
          `\nActualizar en el sistema legacy.`,
      });
    }

    return { ok: true };
  }
);
