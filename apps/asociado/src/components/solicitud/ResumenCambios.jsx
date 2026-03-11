import { useState } from "react";

export default function ResumenCambios({ cambios, adheridos, titular, onQuitarCambio, onEnviar, enviando }) {
  const [error, setError]       = useState(null);
  const [enviado, setEnviado]   = useState(false);
  const [codArea, setCodArea]   = useState("");
  const [celular, setCelular]   = useState("");
  const [errTel, setErrTel]     = useState({});

  const validarTelefono = () => {
    const e = {};
    if (!codArea.trim() || !/^\d{2,4}$/.test(codArea.trim()))
      e.codArea = "Ingresá el código de área sin el 0 (ej: 11, 351)";
    if (!celular.trim() || !/^\d{6,8}$/.test(celular.trim()))
      e.celular = "Ingresá el número sin el 15 (ej: 40123456)";
    return e;
  };

  const handleEnviar = async () => {
    setError(null);
    const e = validarTelefono();
    if (Object.keys(e).length > 0) { setErrTel(e); return; }
    setErrTel({});
    try {
      await onEnviar(titular?.cliCod, titular, {
        codArea: codArea.trim(),
        celular: celular.trim(),
      });
      setEnviado(true);
    } catch (err) {
      setError(err.message || "No se pudo enviar la solicitud.");
    }
  };

  if (enviado) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold text-green-800 text-sm">Solicitud enviada</p>
        <p className="text-xs text-green-600 mt-1">
          Un empleado de CELTA revisará los cambios y recibirás una notificación al resolver.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200">
      {/* Encabezado */}
      <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 rounded-t-xl">
        <h2 className="text-sm font-semibold text-amber-800">
          Cambios pendientes de envío ({cambios.length})
        </h2>
        <p className="text-xs text-amber-600 mt-0.5">
          Revisá los cambios antes de enviar la solicitud.
        </p>
      </div>

      {/* Lista de cambios */}
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

      {/* Celular de contacto */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">
        <p className="text-xs font-medium text-gray-600">
          📱 Dejanos tu celular para poder estar en contacto <span className="text-red-500">*</span>
        </p>
        <div className="flex gap-2 items-start">
          {/* Código de área */}
          <div className="w-24 shrink-0">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">0</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                placeholder="351"
                value={codArea}
                onChange={(e) => { setCodArea(e.target.value.replace(/\D/g, "")); setErrTel((p) => ({ ...p, codArea: null })); }}
                className={`w-full pl-5 pr-2 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errTel.codArea ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 text-center">Cód. área</p>
            {errTel.codArea && <p className="text-xs text-red-500 mt-0.5">{errTel.codArea}</p>}
          </div>

          <span className="text-gray-400 mt-2.5 text-sm">–</span>

          {/* Número */}
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">15</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={8}
                placeholder="40123456"
                value={celular}
                onChange={(e) => { setCelular(e.target.value.replace(/\D/g, "")); setErrTel((p) => ({ ...p, celular: null })); }}
                className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${errTel.celular ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Número sin el 15</p>
            {errTel.celular && <p className="text-xs text-red-500 mt-0.5">{errTel.celular}</p>}
          </div>
        </div>

        {/* Preview del número completo */}
        {codArea && celular && !errTel.codArea && !errTel.celular && (
          <p className="text-xs text-blue-600">
            📞 +54 9 {codArea} {celular}
          </p>
        )}
      </div>

      {/* Error general */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Botón enviar */}
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
