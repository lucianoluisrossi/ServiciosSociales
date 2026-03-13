import { useState } from "react";
import FormAdherido from "./FormAdherido";
import NuevoAdherido from "./NuevoAdherido";

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">
          Familiares adheridos
          <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {adheridos.length}
          </span>
        </h2>
        {!solicitudActiva && (
          <button
            onClick={() => { setAgregando(true); setEditando(null); }}
            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Agregar
          </button>
        )}
      </div>

      {/* Formulario para agregar */}
      {agregando && (
        <div className="p-4 border-b border-blue-50 bg-blue-50/40">
          <NuevoAdherido
            onGuardar={handleGuardarNuevo}
            onCancelar={() => setAgregando(false)}
          />
        </div>
      )}

      {/* Lista vacía */}
      {adheridos.length === 0 && !agregando && (
        <p className="text-sm text-gray-400 text-center py-10">
          No hay familiares adheridos.<br/>
          <span className="text-xs">Podés agregar uno con el botón de arriba.</span>
        </p>
      )}

      {adheridos.map((a) => {
        const cambio = cambioParaDni(a.socDocNro);
        const eliminado = cambio?.tipo === "eliminar";
        const editadoPendiente = cambio?.tipo === "editar";

        return (
          <div key={a.socDocNro}>
            <div
              className={`px-4 py-4 flex items-start justify-between gap-3 transition-colors
                ${eliminado ? "bg-red-50 opacity-60" : "hover:bg-gray-50"}
                ${editadoPendiente ? "bg-amber-50" : ""}
              `}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">
                    {a.socNom}
                  </p>
                  {a.pareDsc && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {a.pareDsc}
                    </span>
                  )}
                  {eliminado && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                      A eliminar
                    </span>
                  )}
                  {editadoPendiente && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      Editado
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  DNI {a.socDocNro}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Nac: {formatFecha(a.cliFecNac)} · Adherido: {formatFecha(a.sumFacFAd)}
                </p>
              </div>

              {!solicitudActiva && (
                <div className="flex flex-col gap-2 shrink-0 pt-0.5">
                  {!eliminado && (
                    <button
                      onClick={() => handleEditar(a)}
                      className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      Editar
                    </button>
                  )}
                  <button
                    onClick={() => handleEliminar(a)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                      ${eliminado
                        ? "text-gray-500 bg-gray-100 hover:bg-gray-200"
                        : "text-red-600 bg-red-50 hover:bg-red-100"
                      }`}
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
