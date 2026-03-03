export default function EstadoSolicitud({ solicitud }) {
  const config = {
    pendiente: {
      bg: "bg-amber-50 border-amber-200",
      icon: "⏳",
      titulo: "Solicitud en revisión",
      desc: "Sus cambios fueron recibidos y están siendo revisados por el equipo de CELTA.",
      color: "text-amber-800",
    },
    aprobada: {
      bg: "bg-green-50 border-green-200",
      icon: "✅",
      titulo: "Solicitud aprobada",
      desc: "Sus cambios fueron aprobados y ya están aplicados en el sistema.",
      color: "text-green-800",
    },
    rechazada: {
      bg: "bg-red-50 border-red-200",
      icon: "❌",
      titulo: "Solicitud rechazada",
      desc: solicitud.motivoRechazo
        ? `Motivo: ${solicitud.motivoRechazo}`
        : "Su solicitud fue rechazada. Puede enviar una nueva solicitud con los datos corregidos.",
      color: "text-red-800",
    },
  };

  const c = config[solicitud.estado] ?? config.pendiente;
  const fecha = solicitud.creadoEn?.toDate?.();
  const fechaStr = fecha
    ? fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className={`rounded-xl border p-4 ${c.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{c.icon}</span>
        <div>
          <p className={`text-sm font-semibold ${c.color}`}>{c.titulo}</p>
          <p className={`text-xs mt-0.5 ${c.color} opacity-80`}>{c.desc}</p>
          {fechaStr && (
            <p className="text-xs text-gray-400 mt-1">Enviada el {fechaStr}</p>
          )}
        </div>
      </div>

      {/* Detalle de cambios */}
      {solicitud.cambios?.length > 0 && (
        <div className="mt-3 border-t border-current/10 pt-2 space-y-1">
          {solicitud.cambios.map((c, i) => (
            <p key={i} className="text-xs text-gray-600">
              {c.tipo === "agregar" ? "➕" : c.tipo === "eliminar" ? "🗑️" : "✏️"}{" "}
              {etiquetaTipo(c.tipo)}: {c.datos?.CliApeContrato ?? c.adheridoDni}
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
