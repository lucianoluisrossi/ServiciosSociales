import { useState } from "react";

export default function ConfirmarCostoInApp({ solicitud, onConfirmar, onCerrar }) {
  const [procesando, setProcesando] = useState(false);
  const [respondido, setRespondido] = useState(null); // "aprobado" | "rechazado"
  const [error, setError]           = useState(null);

  const items = solicitud.confirmacionCosto?.itemsConCosto ?? [];

  const responder = async (respuesta) => {
    setProcesando(true);
    setError(null);
    try {
      await onConfirmar(respuesta);
      setRespondido(respuesta);
    } catch (e) {
      setError(e.message || "Ocurrió un error. Intentá de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  if (respondido === "aprobado") {
    return (
      <Resultado
        icono="✅"
        colorIcono="text-emerald-500"
        titulo="¡Confirmación registrada!"
        texto="Aceptaste el costo mensual del servicio. CELTA procesará el alta."
        onCerrar={onCerrar}
      />
    );
  }

  if (respondido === "rechazado") {
    return (
      <Resultado
        icono="❌"
        colorIcono="text-rose-500"
        titulo="Rechazo registrado"
        texto="Rechazaste el costo mensual. CELTA se comunicará con vos para buscar una solución."
        onCerrar={onCerrar}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-emerald-600 px-5 py-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">✅</span>
          <h2 className="text-xl font-bold">Solicitud aprobada</h2>
        </div>
        <p className="text-emerald-100 text-sm">
          Tus cambios fueron aprobados por CELTA. Necesitamos tu confirmación sobre el costo mensual.
        </p>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        <div>
          <p className="text-base font-semibold text-gray-800 mb-3">
            Los siguientes familiares tienen un costo mensual asociado:
          </p>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <p className="text-base font-bold text-gray-900">
                  {item.socNom ?? `DNI ${item.adheridoDni}`}
                </p>
                <p className="text-lg font-bold text-blue-700 mt-1">{item.costoMensual}</p>
                {item.observaciones && (
                  <p className="text-xs text-gray-500 mt-1">{item.observaciones}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-sm font-bold text-amber-800 mb-1">⚠️ Importante</p>
          <p className="text-sm text-amber-700">
            Al aceptar, autorizás el cobro mensual de este servicio en tu factura.
            Si no aceptás, CELTA se comunicará con vos.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="shrink-0 px-5 pb-8 pt-3 space-y-3 border-t border-gray-100">
        <button
          onClick={() => responder("aprobado")}
          disabled={procesando}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
        >
          {procesando ? <Spinner /> : "✓"} Acepto el costo mensual
        </button>
        <button
          onClick={() => responder("rechazado")}
          disabled={procesando}
          className="w-full border-2 border-rose-300 bg-white hover:bg-rose-50 disabled:opacity-50 text-rose-600 font-bold py-4 rounded-2xl text-base transition-colors"
        >
          No acepto el costo
        </button>
      </div>
    </div>
  );
}

function Resultado({ icono, colorIcono, titulo, texto, onCerrar }) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className={`text-6xl mb-4 ${colorIcono}`}>{icono}</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{titulo}</h2>
      <p className="text-base text-gray-500 leading-relaxed mb-8">{texto}</p>
      <button
        onClick={onCerrar}
        className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
      >
        Volver al panel
      </button>
    </div>
  );
}

function Spinner() {
  return <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
