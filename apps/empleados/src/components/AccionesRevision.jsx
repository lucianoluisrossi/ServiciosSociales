import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const resolverSolicitud = httpsCallable(functions, "resolverSolicitud");

export default function AccionesRevision({ solicitudId, onResuelta }) {
  const [modo, setModo] = useState(null); // null | "aprobar" | "rechazar"
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const confirmar = async () => {
    if (modo === "rechazar" && !motivo.trim()) {
      setError("El motivo de rechazo es obligatorio.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      await resolverSolicitud({
        solicitudId,
        accion: modo === "aprobar" ? "aprobado" : "rechazado",
        motivo: motivo.trim() || undefined,
      });
      onResuelta?.();
    } catch (e) {
      setError(e.message || "Error al procesar la solicitud.");
      setCargando(false);
    }
  };

  if (!modo) {
    return (
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setModo("aprobar")}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
        >
          ✓ Aprobar
        </button>
        <button
          onClick={() => setModo("rechazar")}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
        >
          ✕ Rechazar
        </button>
      </div>
    );
  }

  return (
    <div className={`mt-4 p-4 rounded-xl border ${modo === "aprobar" ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
      <p className="font-semibold text-gray-800 mb-3">
        {modo === "aprobar" ? "¿Confirmás la aprobación?" : "Indicá el motivo del rechazo"}
      </p>

      {modo === "rechazar" && (
        <textarea
          value={motivo}
          onChange={e => { setMotivo(e.target.value); setError(null); }}
          placeholder="Ej: Documentación incompleta, datos no coinciden con el padrón..."
          rows={3}
          className="w-full border border-red-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 bg-white mb-2"
        />
      )}

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={confirmar}
          disabled={cargando}
          className={`flex-1 text-white font-semibold py-2 rounded-lg transition disabled:opacity-60 ${
            modo === "aprobar" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {cargando ? "Procesando..." : "Confirmar"}
        </button>
        <button
          onClick={() => { setModo(null); setMotivo(""); setError(null); }}
          disabled={cargando}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
