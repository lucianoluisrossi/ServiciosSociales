import { useState } from "react";
import SubirDNI from "./SubirDNI";

const PARENTESCOS = [
  "Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a",
  "Abuelo/a", "Nieto/a", "Suegro/a", "Cuñado/a", "Otro",
];

export default function FormAdherido({ inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    CliApeContrato: inicial?.CliApeContrato ?? "",
    CliDocNro: inicial?.CliDocNro ?? "",
    CliFecNac: toInputDate(inicial?.CliFecNac),
    PareDsc: inicial?.PareDsc ?? "",
  });
  const [fotoFrentePath, setFotoFrentePath] = useState(null);
  const [fotoDorsoPath, setFotoDorsoPath] = useState(null);
  const [errores, setErrores] = useState({});

  const esEdicion = !!inicial;

  const set = (campo, val) => {
    setForm((prev) => ({ ...prev, [campo]: val }));
    setErrores((prev) => ({ ...prev, [campo]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.CliApeContrato.trim()) e.CliApeContrato = "Requerido";
    if (!form.CliDocNro.trim() || !/^\d{7,8}$/.test(form.CliDocNro.trim()))
      e.CliDocNro = "DNI inválido (7-8 dígitos)";
    if (!form.CliFecNac) e.CliFecNac = "Requerida";
    if (!form.PareDsc) e.PareDsc = "Requerido";
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    onGuardar(
      { ...form, CliDocNro: form.CliDocNro.trim() },
      fotoFrentePath,
      fotoDorsoPath
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Apellido y nombre *" error={errores.CliApeContrato}>
          <input
            className={input(errores.CliApeContrato)}
            value={form.CliApeContrato}
            onChange={(e) => set("CliApeContrato", e.target.value)}
            placeholder="García Juan"
          />
        </Campo>

        <Campo label="DNI *" error={errores.CliDocNro}>
          <input
            className={input(errores.CliDocNro)}
            value={form.CliDocNro}
            onChange={(e) => set("CliDocNro", e.target.value)}
            placeholder="12345678"
            disabled={esEdicion}
          />
        </Campo>

        <Campo label="Fecha de nacimiento *" error={errores.CliFecNac}>
          <input
            type="date"
            className={input(errores.CliFecNac)}
            value={form.CliFecNac}
            onChange={(e) => set("CliFecNac", e.target.value)}
            max={today()}
          />
        </Campo>

        <Campo label="Parentesco *" error={errores.PareDsc}>
          <select
            className={input(errores.PareDsc)}
            value={form.PareDsc}
            onChange={(e) => set("PareDsc", e.target.value)}
          >
            <option value="">Seleccionar...</option>
            {PARENTESCOS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Campo>
      </div>

      {/* Fotos DNI */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">
          Foto del DNI <span className="text-gray-400">(opcional pero recomendado)</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <SubirDNI
            label="Frente"
            dni={form.CliDocNro}
            lado="frente"
            onSubido={setFotoFrentePath}
          />
          <SubirDNI
            label="Dorso"
            dni={form.CliDocNro}
            lado="dorso"
            onSubido={setFotoDorsoPath}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancelar}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {esEdicion ? "Guardar cambio" : "Agregar familiar"}
        </button>
      </div>
    </div>
  );
}

// Helpers
function input(err) {
  return `w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500
    ${err ? "border-red-400 bg-red-50" : "border-gray-300"}`;
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function toInputDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
