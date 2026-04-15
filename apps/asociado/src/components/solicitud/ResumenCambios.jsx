import { useState } from "react";

export default function ResumenCambios({ cambios, adheridos, titular, onQuitarCambio, onEnviar, enviando, tienePendiente, emailRegistrado }) {
  const [error, setError]     = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [email, setEmail]     = useState("");
  const [errores, setErrores] = useState({});

  const necesitaEmail = emailRegistrado === null;

  const validarCampos = () => {
    const e = {};
    if (necesitaEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Ingresá un email válido";
    return e;
  };

  const handleEnviar = async () => {
    setError(null);
    const e = validarCampos();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    setErrores({});
    try {
      await onEnviar(titular?.cliCod, titular, necesitaEmail ? email.trim() : null);
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
          Un empleado de CELTA revisará los cambios. Recibirás un mail con la aprobación o rechazo de tu solicitud.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Barra superior ámbar */}
      <div className="h-1 bg-amber-400" />
      {/* Encabezado */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            Cambios pendientes
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{cambios.length}</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Revisá antes de enviar</p>
        </div>
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
                DNI {c.adheridoDni} {c.datos?.pareDsc ? ` · ${c.datos.pareDsc}` : ""}
              </p>
              {(c.fotoFrentePath || c.fotoDorsoPath) && (
                <p className="text-xs text-green-600 mt-0.5">📷 Fotos adjuntas</p>
              )}
            </div>
            <button onClick={() => onQuitarCambio(i)} className="text-xs text-gray-400 hover:text-red-500 shrink-0">
              Quitar
            </button>
          </li>
        ))}
      </ul>

      {/* Email — solo si no está registrado */}
      {necesitaEmail && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-1">
          <p className="text-xs font-medium text-gray-600">
            ✉️ Email para recibir el resultado de tu solicitud <span className="text-red-500">*</span>
          </p>
          <input
            type="email"
            inputMode="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrores((p) => ({ ...p, email: null })); }}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores.email ? "border-red-400 bg-red-50" : "border-gray-300"}`}
          />
          {errores.email && <p className="text-xs text-red-500">{errores.email}</p>}
          <p className="text-xs text-gray-400">Lo usaremos solo para avisarte cuando tu solicitud sea revisada.</p>
        </div>
      )}

      {/* Error general */}
      {error && (
        <div className="px-4 pb-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Botón enviar */}
      <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={handleEnviar}
          disabled={enviando || tienePendiente || emailRegistrado === undefined}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 rounded-xl transition-colors shadow-sm"
        >
          {enviando
            ? <span className="flex items-center justify-center gap-2"><Spinner /> Enviando...</span>
            : tienePendiente
              ? "⏳ Solicitud pendiente de revisión"
              : "Enviar solicitud →"}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          CELTA revisará los cambios antes de aplicarlos.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

function etiquetaTipo(tipo) {
  if (tipo === "agregar") return "Agregar familiar";
  if (tipo === "eliminar") return "Eliminar familiar";
  return "Modificar familiar";
}
