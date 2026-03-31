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
    <tr className="border-t border-gray-100 text-sm">
      <td className="py-1.5 pr-4 text-gray-500 whitespace-nowrap w-20">{nombre}</td>
      <td className="py-1.5 text-gray-900">{valor ?? "—"}</td>
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
            <CampoTabla nombre="Ingreso manual"    valor={d.datosManual ? "Sí" : "No"} />
          </tbody>
        </table>
      )}
      {tieneFoto && (
        <div className="mt-2">
          <VisorDNI path={cambio.fotoFrentePath} label="Frente" />
          {cambio.fotoDorsoPath && (
            <VisorDNI path={cambio.fotoDorsoPath} label="Dorso" />
          )}
        </div>
      )}
    </div>
  );
}

export default function DetalleSolicitud({ solicitud, inicial, onResuelta, onVolver }) {
  const data = solicitud ?? inicial;
  const [sol, setSol] = useState(data);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "solicitudes", data.id), (snap) => {
      if (snap.exists) setSol({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [data.id]);

  const pendiente = sol.estado === "pendiente";

  return (
    <div>
      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        {onVolver && (
          <button
            onClick={onVolver}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-3 flex items-center gap-1"
          >
            ← Volver
          </button>
        )}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Solicitud #{sol.clicod}</h2>
            <p className="text-sm text-gray-500">{sol.titularDni} – {sol.titular?.titNom ?? "Sin nombre"}</p>
            <p className="text-sm text-gray-400 mt-1">Nro cuenta: {sol.titular?.sumNro ?? "—"}</p>
            <p className="text-sm text-gray-400 mt-1">Cód. cliente: {sol.clicod ?? "—"}</p>
            {sol.telefonoTitular && (
              <p className="text-sm mt-2">
                📱 <span className="text-gray-500">Celular (SMS):</span>{" "}
                <a href={`tel:${sol.telefonoTitular}`} className="font-medium text-blue-600 hover:underline">
                  {sol.telefonoTitular}
                </a>
              </p>
            )}
            {sol.celularContacto?.completo && (
              <p className="text-sm mt-1">
                📞 <span className="text-gray-500">Celular de contacto:</span>{" "}
                <a href={`tel:${sol.celularContacto.completo}`} className="font-medium text-blue-600 hover:underline">
                  {sol.celularContacto.completo}
                </a>
              </p>
            )}
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full mt-1 ${
            sol.estado === "pendiente" ? "bg-yellow-100 text-yellow-800" :
            sol.estado === "aprobada" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>{sol.estado === "pendiente" ? "Pendiente" : sol.estado === "aprobada" ? "Aprobada" : "Rechazada"}</span>
        </div>
      </div>

      {sol.tieneIngresosManual && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-2.5 mb-4 text-sm text-yellow-800">
          ⚠️ Uno o más cambios fueron ingresados manualmente. Verificar con atención.
        </div>
      )}

      {/* Banner estado confirmación de costo */}
      {sol.confirmacionCosto && (
        <div className={`rounded-lg border px-4 py-3 mb-4 text-sm ${
          sol.confirmacionCosto.estado === "pendiente"
            ? "bg-blue-50 border-blue-200 text-blue-800"
            : sol.confirmacionCosto.estado === "aprobado"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <p className="font-semibold">
            {sol.confirmacionCosto.estado === "pendiente" && "⏳ Esperando confirmación de costo por parte del asociado"}
            {sol.confirmacionCosto.estado === "aprobado"  && "✅ Asociado aceptó el costo mensual"}
            {sol.confirmacionCosto.estado === "rechazado" && "❌ Asociado rechazó el costo mensual — requiere atención"}
          </p>
          {sol.confirmacionCosto.itemsConCosto?.map((d, i) => (
            <p key={i} className="text-xs mt-1 opacity-80">
              {d.socNom ?? `DNI ${d.adheridoDni}`}: {d.costoMensual}
            </p>
          ))}
        </div>
      )}

      {(!sol.cambios || sol.cambios.length === 0) && (
        <p className="text-gray-400 text-sm mb-4">Sin cambios registrados.</p>
      )}

      <div className="space-y-3 mb-6">
        {sol.cambios?.map((c, i) => (
          <TarjetaCambio key={i} cambio={c} dniTitular={sol.titularDni} />
        ))}
      </div>

      {pendiente ? (
        <AccionesRevision solicitudId={sol.id} solicitud={sol} onResuelta={onResuelta} />
      ) : (
        <p className="text-center text-sm text-gray-400 mt-4">
          Solicitud ya resuelta.
        </p>
      )}
    </div>
  );
}
