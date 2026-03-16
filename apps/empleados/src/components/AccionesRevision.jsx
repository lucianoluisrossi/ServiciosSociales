import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const resolverSolicitud = httpsCallable(functions, "resolverSolicitud");

export default function AccionesRevision({ solicitudId, solicitud, onResuelta }) {
  const [modo, setModo] = useState(null); // null | "aprobar" | "rechazar"
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  // Cambios de tipo "agregar" que pueden tener datos adicionales al aprobar
  const cambiosAgregar = (solicitud?.cambios ?? []).filter((c) => c.tipo === "agregar");

  // Estado para observaciones y costo por cada familiar a agregar (keyed por adheridoDni)
  const [datosAprobacion, setDatosAprobacion] = useState(() =>
    Object.fromEntries(
      cambiosAgregar.map((c) => [c.adheridoDni, { observaciones: "", costoMensual: "" }])
    )
  );

  const actualizarDato = (dni, campo, valor) => {
    setDatosAprobacion((prev) => ({
      ...prev,
      [dni]: { ...prev[dni], [campo]: valor },
    }));
  };

  const confirmar = async () => {
    if (modo === "rechazar" && !motivo.trim()) {
      setError("El motivo de rechazo es obligatorio.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      // Armar array de datos de aprobación solo para los "agregar" que tengan algo completado
      const aprobacionData =
        modo === "aprobar"
          ? cambiosAgregar
              .map((c) => ({
                adheridoDni: c.adheridoDni,
                socNom: c.datos?.socNom ?? null,
                observaciones: datosAprobacion[c.adheridoDni]?.observaciones?.trim() || null,
                costoMensual: datosAprobacion[c.adheridoDni]?.costoMensual?.trim() || null,
              }))
              .filter((d) => d.observaciones || d.costoMensual) // solo incluir si hay algo
          : undefined;

      await resolverSolicitud({
        solicitudId,
        accion: modo === "aprobar" ? "aprobado" : "rechazado",
        motivo: motivo.trim() || undefined,
        datosAprobacion: aprobacionData?.length ? aprobacionData : undefined,
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

      {/* Campos adicionales al aprobar — uno por cada familiar a agregar */}
      {modo === "aprobar" && cambiosAgregar.length > 0 && (
        <div className="mb-4 space-y-4">
          {cambiosAgregar.map((c) => (
            <div key={c.adheridoDni} className="bg-white border border-green-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">
                Familiar a agregar: <span className="text-gray-900">{c.datos?.socNom ?? c.adheridoDni}</span>
                <span className="ml-2 text-gray-400 font-normal">DNI {c.adheridoDni}</span>
              </p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Observaciones</label>
                <textarea
                  value={datosAprobacion[c.adheridoDni]?.observaciones ?? ""}
                  onChange={(e) => actualizarDato(c.adheridoDni, "observaciones", e.target.value)}
                  placeholder="Observaciones opcionales..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Costo mensual del servicio</label>
                <input
                  type="text"
                  value={datosAprobacion[c.adheridoDni]?.costoMensual ?? ""}
                  onChange={(e) => actualizarDato(c.adheridoDni, "costoMensual", e.target.value)}
                  placeholder="Ej: $12.500"
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Motivo de rechazo */}
      {modo === "rechazar" && (
        <textarea
          value={motivo}
          onChange={(e) => { setMotivo(e.target.value); setError(null); }}
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
