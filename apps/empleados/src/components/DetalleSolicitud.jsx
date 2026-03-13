import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import VisorDNI from "./VisorDNI";
import AccionesRevision from "./AccionesRevision";

const TIPO_META = {
  agregar:  { label: "Alta de adherido",  color: "bg-blue-100 text-blue-800",   icon: "➕" },
  editar:   { label: "Modificación",       color: "bg-yellow-100 text-yellow-800", icon: "✏️" },
  eliminar: { label: "Baja de adherido",   color: "bg-red-100 text-red-800",     icon: "🗑️" },
};

function formatFecha(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function CampoTabla({ nombre, valor }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-1.5 pr-4 text-xs text-gray-500 font-medium w-36">{nombre}</td>
      <td className="py-1.5 text-sm text-gray-800">{valor || "—"}</td>
    </tr>
  );
}

function TarjetaCambio({ cambio, dniTitular }) {
  const meta = TIPO_META[cambio.tipo] ?? { label: cambio.tipo, color: "bg-gray-100 text-gray-700", icon: "•" };
  const d = cambio.datos ?? {};
  const tieneFoto = !!(cambio.fotoFrentePath || cambio.fotoDorsoPath);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>
        <span className="text-xs text-gray-400">DNI adherido: {cambio.adheridoDni ?? d.socDocNro ?? "—"}</span>
      </div>

      {/* Para bajas solo mostramos el DNI, no hay datos adicionales */}
      {cambio.tipo === "eliminar" ? (
        <p className="text-sm text-gray-500 italic">
          Se solicita dar de baja al adherido con DNI {cambio.adheridoDni}.
        </p>
      ) : (
        <table className="w-full">
          <tbody>
            <CampoTabla nombre="Apellido y nombre" valor={d.socNom} />
            <CampoTabla nombre="DNI"               valor={d.socDocNro} />
            <CampoTabla nombre="Fecha de nac."     valor={formatFecha(d.cliFecNac)} />
            <CampoTabla nombre="Parentesco"        valor={d.pareDsc} />
          </tbody>
        </table>
      )}

      {tieneFoto && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
          {cambio.fotoFrentePath && (
            <VisorDNI path={cambio.fotoFrentePath} label="DNI frente" />
          )}
          {cambio.fotoDorsoPath && (
            <VisorDNI path={cambio.fotoDorsoPath} label="DNI dorso" />
          )}
        </div>
      )}
    </div>
  );
}

export default function DetalleSolicitud({ solicitud: inicial, onVolver, onResuelta }) {
  const [sol, setSol] = useState(inicial);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "solicitudes", inicial.id), snap => {
      if (snap.exists()) setSol({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [inicial.id]);

  const pendiente = sol.estado === "pendiente";

  return (
    <div>
      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Solicitud — DNI {sol.titularDni}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Código cliente: {sol.clicod}</p>
            {sol.celularContacto?.completo ? (
              <a
                href={`tel:${sol.celularContacto.completo}`}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                📱 {sol.celularContacto.codArea} {sol.celularContacto.numero}
              </a>
            ) : (
              <p className="text-sm text-gray-400 mt-1">📱 Sin celular de contacto</p>
            )}
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full mt-1 ${
            sol.estado === "pendiente" ? "bg-yellow-100 text-yellow-800" :
            sol.estado === "aprobado"  ? "bg-green-100 text-green-800" :
                                         "bg-red-100 text-red-800"
          }`}>
            {sol.estado}
          </span>
        </div>

        {sol.estado === "rechazado" && sol.motivoRechazo && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
            <strong>Motivo de rechazo:</strong> {sol.motivoRechazo}
          </div>
        )}

        {sol.tieneIngresosManual && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
            ⚠️ <strong>Atención:</strong> Uno o más familiares fueron ingresados manualmente (no se pudo leer el código del DNI). Verificar con la foto adjunta.
          </div>
        )}
      </div>

      {/* Cambios */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Cambios solicitados ({sol.cambios?.length ?? 0})
      </h3>

      {(!sol.cambios || sol.cambios.length === 0) && (
        <p className="text-gray-400 text-sm mb-4">Sin cambios registrados.</p>
      )}

      <div className="space-y-3 mb-6">
        {sol.cambios?.map((c, i) => (
          <TarjetaCambio key={i} cambio={c} dniTitular={sol.titularDni} />
        ))}
      </div>

      {/* Acciones */}
      {pendiente ? (
        <AccionesRevision solicitudId={sol.id} onResuelta={onResuelta} />
      ) : (
        <p className="text-center text-sm text-gray-400 mt-4">
          Esta solicitud ya fue resuelta y no puede modificarse.
        </p>
      )}
    </div>
  );
}
