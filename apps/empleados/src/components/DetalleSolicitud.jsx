import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import VisorDNI from "./VisorDNI";
import AccionesRevision from "./AccionesRevision";

const TIPO_LABEL = {
  alta_adherido:      { label: "Alta de adherido",      color: "bg-blue-100 text-blue-800" },
  modificacion:       { label: "Modificación",           color: "bg-yellow-100 text-yellow-800" },
  baja_adherido:      { label: "Baja de adherido",       color: "bg-red-100 text-red-800" },
};

function CampoTabla({ nombre, valor }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-1.5 pr-4 text-xs text-gray-500 font-medium w-36">{nombre}</td>
      <td className="py-1.5 text-sm text-gray-800">{valor ?? "—"}</td>
    </tr>
  );
}

function TarjetaCambio({ cambio, dniTitular }) {
  const meta = TIPO_LABEL[cambio.tipo] ?? { label: cambio.tipo, color: "bg-gray-100 text-gray-700" };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
          {meta.label}
        </span>
        {cambio.tipo !== "baja_adherido" && cambio.socDocNro && (
          <span className="text-xs text-gray-500">DNI adherido: {cambio.socDocNro}</span>
        )}
      </div>

      <table className="w-full">
        <tbody>
          {cambio.socDocNro  && <CampoTabla nombre="DNI"           valor={cambio.socDocNro} />}
          {cambio.socNom     && <CampoTabla nombre="Nombre"        valor={cambio.socNom} />}
          {cambio.cliFecNac  && <CampoTabla nombre="Fecha de nac." valor={cambio.cliFecNac} />}
          {cambio.pareDsc    && <CampoTabla nombre="Parentesco"    valor={cambio.pareDsc} />}
          {cambio.sumFacFAd  && <CampoTabla nombre="Fecha alta"    valor={cambio.sumFacFAd} />}
        </tbody>
      </table>

      {cambio.tieneFoto && cambio.socDocNro && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <VisorDNI dniTitular={dniTitular} dniAdherido={cambio.socDocNro} />
        </div>
      )}
    </div>
  );
}

export default function DetalleSolicitud({ solicitud: inicial, onVolver, onResuelta }) {
  const [sol, setSol] = useState(inicial);

  // Escuchar cambios en tiempo real
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
            <h2 className="text-lg font-bold text-gray-800">Solicitud de DNI {sol.titularDni}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Código cliente: {sol.clicod}</p>
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
