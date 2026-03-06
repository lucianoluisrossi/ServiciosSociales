import { useState } from "react";
import FormAdherido from "./FormAdherido";

export default function ListaAdheridos({ adheridos, cambios, onAgregarCambio, onQuitarCambio, solicitudActiva }) {
  const [editando, setEditando] = useState(null);
  const [agregando, setAgregando] = useState(false);

  const cambioParaDni = (dni) => cambios.find((c) => c.adheridoDni === dni);

  const handleEditar = (adherido) => {
    setAgregando(false);
    setEditando(adherido.socDocNro);
  };

  const handleEliminar = (adherido) => {
    const existente = cambioParaDni(adherido.socDocNro);
    if (existente?.tipo === "eliminar") {
      const idx = cambios.indexOf(existente);
      onQuitarCambio(idx);
    } else {
      onAgregarCambio({
        tipo: "eliminar",
        adheridoDni: adherido.socDocNro,
        datos: adherido,
      });
      setEditando(null);
    }
  };

  const handleGuardarEdicion = (datos, fotoFrentePath, fotoDorsoPath) => {
    onAgregarCambio({
      tipo: "editar",
      adheridoDni: datos.socDocNro,
      datos,
      fotoFrentePath,
      fotoDorsoPath,
    });
    setEditando(null);
  };

  const handleGuardarNuevo = (datos, fotoFrentePath, fotoDorsoPath) => {
    onAgregarCambio({
      tipo: "agregar",
      adheridoDni: datos.socDocNro,
      datos,
      fotoFrentePath,
      fotoDorsoPath,
    });
    setAgregando(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Familiares adheridos ({adheridos.length})
        </h2>
        {!solicitudActiva && (
          <button
            onClick={() => { setAgregando(true); setEditando(null); }}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            + Agregar familiar
          </button>
        )}
      </div>

      {/* Formulario para agregar */}
      {agregando && (
        <div className="p-4 border-b border-blue-50 bg-blue-50/30">
          <p className="text-xs font-semibold text-blue-700 mb-3">Nuevo familiar</p>
          <FormAdherido
            onGuardar={handleGuardarNuevo}
            onCancelar={() => setAgregando(false)}
          />
        </div>
      )}

      {/* Lista vacía */}
      {adheridos.length === 0 && !agregando && (
        <p className="text-sm text-gray-400 text-center py-8">
          No hay familiares adheridos.
        </p>
      )}

      {adheridos.map((a) => {
        const cambio = cambioParaDni(a.socDocNro);
        const eliminado = cambio?.tipo === "eliminar";
        const editadoPendiente = cambio?.tipo === "editar";

        return (
          <div key={a.socDocNro}>
            <div
              className={`px-4 py-3 flex items-start justify-between gap-3 transition-colors
                ${eliminado ? "bg-red-50 opacity-60" : ""}
                ${editadoPendiente ? "bg-amber-50" : ""}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">
                    {a.socNom}
                  </p>
                  <span className="text-xs text-gray-400">{a.pareDsc}</span>
                  {eliminado && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                      A eliminar
                    </span>
                  )}
                  {editadoPendiente && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Editado
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  DNI: {a.socDocNro} &middot; Nac: {formatFecha(a.cliFecNac)}
                </p>
                <p className="text-xs text-gray-400">
                  Adherido: {formatFecha(a.sumFacFAd)}
                </p>
              </div>

              {!solicitudActiva && (
                <div className="flex gap-3 shrink-0 pt-0.5">
                  {!eliminado && (
                    <button
                      onClick={() => handleEditar(a)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleEliminar(a)}
                    className={`text-xs hover:underline ${eliminado ? "text-gray-500" : "text-red-500"}`}
                  >
                    {eliminado ? "Deshacer" : "Eliminar"}
                  </button>
                </div>
              )}
            </div>

            {/* Formulario inline de edición */}
            {editando === a.socDocNro && (
              <div className="px-4 pb-4 pt-2 bg-blue-50/30 border-b border-blue-100">
                <FormAdherido
                  inicial={a}
                  onGuardar={handleGuardarEdicion}
                  onCancelar={() => setEditando(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatFecha(str) {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
