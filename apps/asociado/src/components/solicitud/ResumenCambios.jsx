// components/solicitud/ResumenCambios.jsx
import { useSolicitud } from "../../hooks/useSolicitud";

export default function ResumenCambios({ titular }) {
  const {
    cambios,
    cambiosTitular,
    hayAlgoCambio,
    enviando,
    error,
    enviarSolicitud,
  } = useSolicitud(titular);

  if (!hayAlgoCambio) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mt-6">
      <h3 className="text-base font-semibold text-amber-800 mb-4">
        📋 Resumen de cambios a enviar
      </h3>

      {/* Cambios en datos del titular */}
      {cambiosTitular && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Datos del titular
          </p>
          <ul className="space-y-1">
            {cambiosTitular.celular !== undefined && (
              <li className="text-sm text-gray-700">
                <span className="font-medium">Celular:</span>{" "}
                {cambiosTitular.celular || (
                  <span className="italic text-gray-400">sin número</span>
                )}
              </li>
            )}
            {cambiosTitular.facturaElectronica !== undefined && (
              <li className="text-sm text-gray-700">
                <span className="font-medium">Factura electrónica:</span>{" "}
                {cambiosTitular.facturaElectronica ? "Activar" : "Desactivar"}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Cambios en adheridos */}
      {cambios.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Familiares adheridos
          </p>
          <ul className="space-y-2">
            {cambios.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <TipoBadge tipo={c.tipo} />
                <span>
                  {c.datos?.socNom ?? `DNI ${c.datos?.socDocNro}`}
                  {c.datos?.pareDsc && (
                    <span className="text-gray-400"> · {c.datos.pareDsc}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {/* Botón enviar */}
      <button
        onClick={enviarSolicitud}
        disabled={enviando}
        className="w-full bg-blue-700 text-white text-sm font-semibold py-3 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {enviando ? "Enviando..." : "Enviar solicitud de cambios"}
      </button>
      <p className="text-xs text-amber-700 mt-2 text-center">
        Un empleado de CELTA revisará y aprobará los cambios.
      </p>
    </div>
  );
}

function TipoBadge({ tipo }) {
  const config = {
    agregar: { label: "Nuevo", color: "bg-green-100 text-green-700" },
    editar: { label: "Edición", color: "bg-blue-100 text-blue-700" },
    eliminar: { label: "Baja", color: "bg-red-100 text-red-700" },
  };
  const { label, color } = config[tipo] ?? { label: tipo, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${color}`}>
      {label}
    </span>
  );
}
