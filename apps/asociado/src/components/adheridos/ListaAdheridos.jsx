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
    const dni = datos.socDocNro?.trim();
    const yaExisteEnLista   = adheridos.some((a) => a.socDocNro === dni);
    const yaExisteEnCambios = cambios.some((c) => c.tipo === "agregar" && c.adheridoDni === dni);
    if (yaExisteEnLista || yaExisteEnCambios) {
      return { ok: false, error: `El DNI ${dni} ya está en la lista. No se puede agregar dos veces.` };
    }
    onAgregarCambio({ tipo: "agregar", adheridoDni: dni, datos, fotoFrentePath, fotoDorsoPath });
    setAgregando(false);
    return { ok: true };
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

      {/* Wizard fullscreen para agregar */}
      {agregando && (
        <NuevoAdherido
          onGuardar={handleGuardarNuevo}
          onCancelar={() => setAgregando(false)}
        />
      )}

      {/* Lista vacía */}
      {adheridos.length === 0 && !agregando && (
        <div className="text-center py-10 px-6">
          <p className="text-3xl mb-3">👨‍👩‍👧‍👦</p>
          <p className="text-sm font-medium text-gray-600">No hay familiares adheridos</p>
          <p className="text-xs text-gray-400 mt-1">Agregá un familiar tocando el botón de arriba.</p>
        </div>
      )}

      {adheridos.map((a) => {
        const cambio = cambioParaDni(a.socDocNro);
        const eliminado = cambio?.tipo === "eliminar";
        const editadoPendiente = cambio?.tipo === "editar";
        const iniciales = a.socNom
          ? a.socNom.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()
          : "?";

        return (
          <div key={a.socDocNro}>
            <div
              className={`px-4 py-3.5 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0
                ${eliminado ? "bg-rose-50 opacity-60" : "hover:bg-gray-50/80"}
                ${editadoPendiente ? "bg-amber-50" : ""}
              `}
            >
              {/* Avatar */}
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                ${eliminado ? "bg-rose-100 text-rose-500" : editadoPendiente ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {iniciales}
              </div>

              <div className="flex-1 min-w-0">
                {/* Nombre */}
                <p className="text-base font-bold text-gray-900 leading-tight">{a.socNom}</p>

                {/* Vínculo / estado */}
                <div className="flex items-center gap-1.5 flex-wrap mt-1">
                  {a.pareDsc && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{a.pareDsc}</span>
                  )}
                  {eliminado && (
                    <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold">A eliminar</span>
                  )}
                  {editadoPendiente && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Editado</span>
                  )}
                </div>

                {/* Datos clave */}
                <div className="grid grid-cols-2 gap-x-4 mt-2">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">DNI</p>
                    <p className="text-sm font-bold text-gray-800">{a.socDocNro}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nacimiento</p>
                    <p className="text-sm font-bold text-gray-800">{formatFecha(a.cliFecNac)}</p>
                  </div>
                </div>

                {/* Botones */}
                {!solicitudActiva && (
                  <div className="flex gap-2 mt-3">
                    {!eliminado && (
                      <button
                        onClick={() => handleEditar(a)}
                        className="flex-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl font-semibold transition-colors"
                      >
                        ✏️ Editar
                      </button>
                    )}
                    <button
                      onClick={() => handleEliminar(a)}
                      className={`flex-1 text-sm px-3 py-2 rounded-xl font-semibold transition-colors
                        ${eliminado ? "text-gray-500 bg-gray-100 hover:bg-gray-200" : "text-rose-600 bg-rose-50 hover:bg-rose-100"}`}
                    >
                      {eliminado ? "↩ Deshacer" : "🗑 Eliminar"}
                    </button>
                  </div>
                )}
              </div>
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
  const iso = typeof str === "string" && str.includes("T") ? str.slice(0, 10) : String(str);
  const parts = iso.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
}
