// components/DetalleSolicitud.jsx
import { useState } from "react";
import VisorDNI from "./VisorDNI";
import AccionesRevision from "./AccionesRevision";

export default function DetalleSolicitud({ solicitud, onResuelto }) {
  const [dniAbierto, setDniAbierto] = useState(null);

  if (!solicitud) return null;

  const { titular, cambios = [], cambiosTitular, estado, motivoRechazo } = solicitud;

  return (
    <div className="space-y-5">
      {/* Encabezado titular */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Titular</p>
        <p className="text-lg font-semibold text-gray-800">{titular?.titNom}</p>
        <p className="text-sm text-gray-500">
          DNI {titular?.socDocNro} · Contrato {titular?.sumNro}
        </p>
        <EstadoBadge estado={estado} />
        {motivoRechazo && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            Motivo de rechazo: {motivoRechazo}
          </p>
        )}
      </div>

      {/* Cambios en datos del titular */}
      {cambiosTitular && (
        <Section titulo="Cambios en datos del titular" icono="👤">
          <div className="space-y-3">
            {cambiosTitular.celular !== undefined && (
              <FilaCambio
                label="Celular"
                antes={cambiosTitular.original?.celular ?? "Sin número"}
                despues={cambiosTitular.celular || "Sin número"}
              />
            )}
            {cambiosTitular.facturaElectronica !== undefined && (
              <FilaCambio
                label="Factura electrónica"
                antes={
                  cambiosTitular.original?.facturaElectronica
                    ? "Activa"
                    : "Inactiva"
                }
                despues={
                  cambiosTitular.facturaElectronica ? "Activar" : "Desactivar"
                }
              />
            )}
          </div>
        </Section>
      )}

      {/* Cambios en adheridos */}
      {cambios.length > 0 && (
        <Section titulo="Familiares adheridos" icono="👨‍👩‍👧">
          <div className="space-y-3">
            {cambios.map((c, i) => (
              <TarjetaCambioAdherido
                key={i}
                cambio={c}
                onVerDni={(path) => setDniAbierto(path)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Acciones */}
      {estado === "pendiente" && (
        <AccionesRevision
          solicitudId={solicitud.id}
          titularDni={solicitud.titularDni}
          onResuelto={onResuelto}
        />
      )}

      {/* Visor DNI */}
      {dniAbierto && (
        <VisorDNI path={dniAbierto} onCerrar={() => setDniAbierto(null)} />
      )}
    </div>
  );
}

// --- Sub-componentes ---

function Section({ titulo, icono, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-semibold text-gray-700 mb-3">
        {icono} {titulo}
      </p>
      {children}
    </div>
  );
}

function FilaCambio({ label, antes, despues }) {
  const cambio = antes !== despues;
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm text-gray-500 w-40 shrink-0">{label}</p>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-gray-400 line-through">{antes}</span>
        <span className="text-gray-300">→</span>
        <span className={cambio ? "text-blue-700 font-medium" : "text-gray-600"}>
          {despues}
        </span>
      </div>
    </div>
  );
}

function TarjetaCambioAdherido({ cambio, onVerDni }) {
  const { tipo, datos } = cambio;
  const colorTipo = {
    agregar: "border-l-green-500",
    editar: "border-l-blue-500",
    eliminar: "border-l-red-400",
  }[tipo] ?? "border-l-gray-300";

  const labelTipo = {
    agregar: "Nuevo familiar",
    editar: "Modificación",
    eliminar: "Baja",
  }[tipo] ?? tipo;

  return (
    <div className={`border-l-4 ${colorTipo} pl-4 py-1`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-800">
          {datos?.socNom ?? `DNI ${datos?.socDocNro}`}
        </p>
        <span className="text-xs text-gray-400">{labelTipo}</span>
      </div>
      <p className="text-xs text-gray-500">
        DNI {datos?.socDocNro}
        {datos?.pareDsc && ` · ${datos.pareDsc}`}
        {datos?.cliFecNac && ` · Nac. ${formatearFecha(datos.cliFecNac)}`}
      </p>
      {/* Fotos DNI si existen */}
      {datos?.fotoDniFrenteUrl && (
        <button
          onClick={() => onVerDni(datos.fotoDniFrenteUrl)}
          className="text-xs text-blue-600 hover:underline mt-1 mr-3"
        >
          Ver frente DNI
        </button>
      )}
      {datos?.fotoDniDorsoUrl && (
        <button
          onClick={() => onVerDni(datos.fotoDniDorsoUrl)}
          className="text-xs text-blue-600 hover:underline mt-1"
        >
          Ver dorso DNI
        </button>
      )}
    </div>
  );
}

function EstadoBadge({ estado }) {
  const config = {
    pendiente: "bg-yellow-100 text-yellow-700",
    aprobada: "bg-green-100 text-green-700",
    rechazada: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
        config[estado] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {estado}
    </span>
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleDateString("es-AR");
  } catch {
    return fecha;
  }
}
