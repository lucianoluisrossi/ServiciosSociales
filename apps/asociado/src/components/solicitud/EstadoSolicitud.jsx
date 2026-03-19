export default function EstadoSolicitud({ solicitud, compacto = false }) {
  const config = {
    pendiente: {
      bg: "bg-amber-50 border-amber-200",
      icon: "⏳",
      titulo: "Solicitud en revisión",
      desc: "Sus cambios están siendo revisados por CELTA.",
      color: "text-amber-800",
    },
    aprobada: {
      bg: "bg-green-50 border-green-200",
      icon: "✅",
      titulo: "Solicitud aprobada",
      desc: compacto
        ? "Sus cambios fueron aprobados."
        : "Sus cambios fueron aprobados. Si necesitás hacer nuevas modificaciones, podés hacerlo ahora.",
      color: "text-green-800",
    },
    rechazada: {
      bg: "bg-red-50 border-red-200",
      icon: "❌",
      titulo: "Solicitud rechazada",
      desc: solicitud.motivoRechazo
        ? `Motivo: ${solicitud.motivoRechazo}.${compacto ? "" : " Podés corregir los datos y enviar una nueva solicitud."}`
        : `Su solicitud fue rechazada.${compacto ? "" : " Podés corregir los datos y enviar una nueva solicitud."}`,
      color: "text-red-800",
    },
  };

  const c = config[solicitud.estado] ?? config.pendiente;
  const fecha = solicitud.creadoEn?.toDate?.();
  const fechaStr = fecha
    ? fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <div className={`rounded-xl border p-4 ${c.bg} ${compacto ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{c.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${c.color}`}>{c.titulo}</p>
          <p className={`text-xs mt-0.5 ${c.color} opacity-80`}>{c.desc}</p>
          {fechaStr && (
            <p className="text-xs text-gray-400 mt-1">Enviada el {fechaStr}</p>
          )}
        </div>
      </div>

      {/* Detalle de cambios — solo en modo completo */}
      {!compacto && solicitud.cambios?.length > 0 && (
        <div className="mt-3 border-t border-current/10 pt-2 space-y-1">
          {solicitud.cambios.map((c, i) => (
            <p key={i} className="text-xs text-gray-600">
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
