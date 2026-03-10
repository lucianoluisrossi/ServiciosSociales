import { useState } from "react";

export default function ResumenCambios({ cambios, adheridos, titular, onQuitarCambio, onEnviar, enviando }) {
  const [error, setError] = useState(null);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    setError(null);
    try {
      await onEnviar(titular?.cliCod, titular);
      setEnviado(true);
    } catch (e) {
      setError(e.message || "No se pudo enviar la solicitud.");
    }
  };

  if (enviado) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold text-green-800 text-sm">Solicitud enviada</p>
        <p className="text-xs text-green-600 mt-1">
          Un empleado de CELTA revisará los cambios y recibirá una notificación al resolver.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200">
      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 rounded-t-xl">
        <h2 className="text-sm font-semibold text-amber-800">
          Cambios pendientes de envío ({cambios.length})
        </h2>
        <p className="text-xs text-amber-600 mt-0.5">
          Revisá los cambios antes de enviar la solicitud.
        </p>
      </div>
      <ul className="divide-y divide-gray-100">
        {cambios.map((c, i) => (
          <li key={i} className="px-4 py-3 flex items-start gap-3">
            <span className="mt-0.5 text-base">
              {c.tipo === "agregar" ? "➕" : c.tipo === "eliminar" ? "🗑️" : "✏️"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">
                {etiquetaTipo(c.tipo)}: {c.datos?.socNom ?? "—"}
              </p>
              <p className="text-xs text-gray-500">
                DNI {c.adheridoDni}
                {c.datos?.pareDsc ? ` · ${c.datos.pareDsc}` : ""}
              </p>
              {(c.fotoFrentePath || c.fotoDorsoPath) && (
                <p className="text-xs text-green-600 mt-0.5">📷 Fotos adjuntas</p>
              )}
            </div>
            <button
              onClick={() => onQuitarCambio(i)}
              className="text-xs text-gray-400 hover:text-red-500 shrink-0"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={handleEnviar}
          disabled={enviando}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {enviando ? "Enviando..." : "Enviar solicitud de cambios"}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Los cambios serán revisados por CELTA antes de aplicarse.
        </p>
      </div>
    </div>
  );
}

function etiquetaTipo(tipo) {
  if (tipo === "agregar") return "Agregar familiar";
  if (tipo === "eliminar") return "Eliminar familiar";
  return "Modificar familiar";
}