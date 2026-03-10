import { useState } from "react";

export default function DatosTitular({ titular, onChange }) {
  const [editando, setEditando] = useState(false);
  const [celular, setCelular] = useState(titular?.celular ?? "");
  const [facturaElectronica, setFacturaElectronica] = useState(
    titular?.facturaElectronica ?? false
  );

  const celularOriginal = titular?.celular ?? "";
  const facturaOriginal = titular?.facturaElectronica ?? false;

  const hayCambios =
    celular !== celularOriginal || facturaElectronica !== facturaOriginal;

  function handleGuardar() {
    onChange?.({ celular: celular.trim(), facturaElectronica });
    setEditando(false);
  }

  function handleCancelar() {
    setCelular(celularOriginal);
    setFacturaElectronica(facturaOriginal);
    setEditando(false);
  }

  if (!titular) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Encabezado con nombre */}
      <div className="bg-blue-600 px-4 py-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-blue-200 uppercase tracking-wide font-medium mb-0.5">Titular</p>
          <h2 className="text-lg font-bold text-white leading-tight">{titular.titNom ?? "—"}</h2>
        </div>
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="text-xs text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors mt-1"
          >
            Editar
          </button>
        )}
      </div>

      {/* Grilla de datos fijos */}
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        <Dato label="N° Documento"   value={titular.socDocNro} />
        <Dato label="Cód. Asociado"  value={titular.cliCod} />
        <Dato label="Cuenta"         value={titular.sumNro} />
        <Dato label="Fecha Nac."     value={formatFecha(titular.cliFecNac)} />
        <Dato label="Fecha Adhesión" value={formatFecha(titular.sumFacFAd)} fullWidth />
      </div>

      {/* Campos editables */}
      <div className="px-4 py-4 space-y-4 border-t border-gray-100">
        {/* Celular */}
        <div>
          <label className="block text-xs text-gray-400 mb-1 font-medium">
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
            <p className="text-sm font-semibold text-gray-800">
              {celular || <span className="text-gray-400 font-normal italic">No registrado</span>}
            </p>
          )}
        </div>

        {/* Factura electrónica */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Factura electrónica</p>
            <p className="text-xs text-gray-400">Recibí tu factura por email</p>
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
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              facturaElectronica
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {facturaElectronica ? "Activa" : "Inactiva"}
            </span>
          )}
        </div>
      </div>

      {/* Botones */}
      {editando && (
        <div className="flex gap-3 px-4 pb-4">
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

      {/* Aviso cambios pendientes */}
      {!editando && hayCambios && (
        <p className="mx-4 mb-4 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          ✏️ Hay cambios pendientes de envío en tus datos.
        </p>
      )}
    </div>
  );
}

function Dato({ label, value, fullWidth }) {
  return (
    <div className={`bg-white px-4 py-3 ${fullWidth ? "col-span-2" : ""}`}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

// Fix timezone: parsea la fecha tomando solo la parte YYYY-MM-DD sin convertir a hora local
function formatFecha(val) {
  if (!val) return "—";
  try {
    const str = val?.toDate ? val.toDate().toISOString() : String(val);
    const [anio, mes, dia] = str.split("T")[0].split("-");
    if (!anio || !mes || !dia) return val;
    return `${dia}/${mes}/${anio}`;
  } catch {
    return val;
  }
}
