// components/titular/DatosTitular.jsx
import { useState } from "react";

export default function DatosTitular({ titular, onChange }) {
  const [editando, setEditando] = useState(false);
  const [celular, setCelular] = useState(titular?.celular ?? "");
  const [facturaElectronica, setFacturaElectronica] = useState(
    titular?.facturaElectronica ?? false
  );

  // Valores originales para detectar cambios
  const celularOriginal = titular?.celular ?? "";
  const facturaOriginal = titular?.facturaElectronica ?? false;

  const hayCambios =
    celular !== celularOriginal || facturaElectronica !== facturaOriginal;

  function handleGuardar() {
    // Notifica al hook padre (useSolicitud) que hay cambios en el titular
    onChange?.({
      celular: celular.trim(),
      facturaElectronica,
    });
    setEditando(false);
  }

  function handleCancelar() {
    setCelular(celularOriginal);
    setFacturaElectronica(facturaOriginal);
    setEditando(false);
  }

  if (!titular) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {titular.titNom}
          </h2>
          <p className="text-sm text-gray-500">
            DNI {titular.socDocNro} · Socio {titular.cliCod}
          </p>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Editar
          </button>
        )}
      </div>

      {/* Datos de solo lectura */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Dato label="N° de contrato" valor={titular.sumNro} />
        <Dato
          label="Fecha de alta"
          valor={formatearFecha(titular.sumFacFAd)}
        />
      </div>

      {/* Campos editables */}
      <div className="border-t border-gray-100 pt-4 space-y-4">
        {/* Celular */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Número de celular
          </label>
          {editando ? (
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="Ej: 2364 123456"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-sm text-gray-800">
              {celular || (
                <span className="text-gray-400 italic">No registrado</span>
              )}
            </p>
          )}
        </div>

        {/* Factura electrónica */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Factura electrónica
            </p>
            <p className="text-xs text-gray-400">
              Recibí tu factura por email en lugar de papel
            </p>
          </div>
          {editando ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={facturaElectronica}
                onChange={(e) => setFacturaElectronica(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          ) : (
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                facturaElectronica
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {facturaElectronica ? "Activa" : "Inactiva"}
            </span>
          )}
        </div>
      </div>

      {/* Botones */}
      {editando && (
        <div className="flex gap-3 mt-5">
          <button
            onClick={handleGuardar}
            disabled={!hayCambios}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Guardar cambios
          </button>
          <button
            onClick={handleCancelar}
            className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Aviso de cambios pendientes */}
      {!editando && hayCambios && (
        <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          ✏️ Hay cambios pendientes de envío en tus datos.
        </p>
      )}
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{valor ?? "—"}</p>
    </div>
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return fecha;
  }
}
