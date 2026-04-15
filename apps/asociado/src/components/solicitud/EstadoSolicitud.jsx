const EMAIL_REMINDER = "Revisá tu casilla de correo para ver el detalle completo.";

export default function EstadoSolicitud({ solicitud, compacto = false }) {
  const config = {
    pendiente: {
      pill:   "bg-amber-100 text-amber-700",
      bar:    "bg-amber-400",
      icon:   "⏳",
      titulo: "Solicitud en revisión",
      desc:   "Tus cambios están siendo revisados por CELTA.",
    },
    aprobada: {
      pill:   "bg-emerald-100 text-emerald-700",
      bar:    "bg-emerald-400",
      icon:   "✅",
      titulo: "Solicitud aprobada",
      desc:   compacto
        ? "Tus cambios fueron aprobados."
        : `Tus cambios fueron aprobados. ${EMAIL_REMINDER}`,
    },
    rechazada: {
      pill:   "bg-rose-100 text-rose-700",
      bar:    "bg-rose-400",
      icon:   "❌",
      titulo: "Solicitud observada",
      desc:   solicitud.motivoRechazo
        ? `Motivo: ${solicitud.motivoRechazo}.${!compacto ? ` ${EMAIL_REMINDER} Podés corregir y enviar una nueva solicitud.` : ""}`
        : `Tu solicitud fue observada.${!compacto ? ` ${EMAIL_REMINDER} Podés corregir y enviar una nueva solicitud.` : ""}`,
    },
    costo_rechazado: {
      pill:   "bg-rose-100 text-rose-700",
      bar:    "bg-rose-400",
      icon:   "❌",
      titulo: "Costo no aceptado",
      desc:   compacto
        ? "Rechazaste el costo mensual del servicio."
        : `Rechazaste el costo mensual del servicio. CELTA se comunicará con vos.`,
    },
  };

  const c = config[solicitud.estado] ?? config.pendiente;
  const fecha = solicitud.creadoEn?.toDate?.();
  const fechaStr = fecha
    ? fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm transition-opacity ${compacto ? "opacity-60" : ""}`}>
      {/* Barra de color superior */}
      <div className={`h-1 ${c.bar}`} />

      <div className="px-4 py-3 flex items-start gap-3">
        <span className="text-xl mt-0.5">{c.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{c.titulo}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${c.pill}`}>
              {solicitud.estado}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.desc}</p>
          {fechaStr && (
            <p className="text-xs text-gray-400 mt-1">Enviada el {fechaStr}</p>
          )}
        </div>
      </div>

      {/* Detalle de cambios — solo modo completo */}
      {!compacto && solicitud.cambios?.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-50 pt-2 space-y-1">
          {solicitud.cambios.map((c, i) => (
            <p key={i} className="text-xs text-gray-500">
              {c.tipo === "agregar" ? "➕" : c.tipo === "eliminar" ? "🗑️" : "✏️"}{" "}
              {etiquetaTipo(c.tipo)}: {c.datos?.socNom ?? c.adheridoDni}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function etiquetaTipo(tipo) {
  if (tipo === "agregar") return "Agregar";
  if (tipo === "eliminar") return "Eliminar";
  return "Modificar";
}
