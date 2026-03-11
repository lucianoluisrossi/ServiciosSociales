import { useState } from "react";
import SubirDNI from "./SubirDNI";

const PARENTESCOS = [
  "Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a",
  "Abuelo/a", "Nieto/a", "Suegro/a", "Cuñado/a", "Otro",
];

export default function FormAdherido({ inicial, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    socNom:    inicial?.socNom    ?? "",
    socDocNro: inicial?.socDocNro ?? "",
    cliFecNac: toInputDate(inicial?.cliFecNac),
    pareDsc:   inicial?.pareDsc   ?? "",
  });
  const [fotoFrentePath, setFotoFrentePath] = useState(null);
  const [fotoDorsoPath,  setFotoDorsoPath]  = useState(null);
  const [errores, setErrores] = useState({});

  const esEdicion = !!inicial;

  const set = (campo, val) => {
    setForm((prev) => ({ ...prev, [campo]: val }));
    setErrores((prev) => ({ ...prev, [campo]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.socNom.trim())    e.socNom = "Requerido";
    if (!form.socDocNro.trim() || !/^\d{7,8}$/.test(form.socDocNro.trim()))
      e.socDocNro = "DNI inválido (7-8 dígitos)";
    if (!form.cliFecNac)        e.cliFecNac = "Requerida";
    if (!form.pareDsc)          e.pareDsc = "Requerido";
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    onGuardar(
      { ...form, socDocNro: form.socDocNro.trim() },
      fotoFrentePath,
      fotoDorsoPath
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Apellido y nombre *" error={errores.socNom}>
          <input
            className={input(errores.socNom)}
            value={form.socNom}
            onChange={(e) => set("socNom", e.target.value)}
            placeholder="García Juan"
          />
        </Campo>

        <Campo label="DNI *" error={errores.socDocNro}>
          <input
            className={input(errores.socDocNro)}
            value={form.socDocNro}
            onChange={(e) => set("socDocNro", e.target.value)}
            placeholder="12345678"
            disabled={esEdicion}
          />
        </Campo>

        <Campo label="Fecha de nacimiento *" error={errores.cliFecNac}>
          <input
            type="date"
            className={input(errores.cliFecNac)}
            value={form.cliFecNac}
            onChange={(e) => set("cliFecNac", e.target.value)}
            max={today()}
          />
        </Campo>

        <Campo label="Parentesco *" error={errores.pareDsc}>
          <select
            className={input(errores.pareDsc)}
            value={form.pareDsc}
            onChange={(e) => set("pareDsc", e.target.value)}
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
            dni={form.socDocNro}
            lado="frente"
            onSubido={setFotoFrentePath}
          />
          <SubirDNI
            label="Dorso"
            dni={form.socDocNro}
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
