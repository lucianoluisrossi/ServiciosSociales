import { useState } from "react";
import SubirDNI from "./SubirDNI";

const PARENTESCOS = [
  "Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a",
  "Abuelo/a", "Nieto/a", "Suegro/a", "Cuñado/a", "Otro",
];

/**
 * La API devuelve socNom como "APELLIDO NOMBRE" (concatenado).
 * Estrategia: primera palabra = apellido, resto = nombre.
 */
function splitApellidoNombre(socNom = "") {
  const partes = socNom.trim().split(/\s+/);
  if (partes.length === 0) return { apellido: "", nombre: "" };
  if (partes.length === 1) return { apellido: partes[0], nombre: "" };
  return { apellido: partes[0], nombre: partes.slice(1).join(" ") };
}

export default function FormAdherido({ adherido, onGuardar, onCancelar }) {
  const split = splitApellidoNombre(adherido?.socNom);

  const [apellido, setApellido] = useState(split.apellido);
  const [nombre, setNombre]     = useState(split.nombre);
  const [form, setForm] = useState({
    socDocNro: adherido?.socDocNro ?? "",
    cliFecNac: toInputDate(adherido?.cliFecNac),
    pareDsc:   adherido?.pareDsc   ?? "",
  });
  const [fotoFrentePath, setFotoFrentePath] = useState(null);
  const [fotoDorsoPath,  setFotoDorsoPath]  = useState(null);
  const [errores, setErrores] = useState({});

  const esEdicion = !!adherido;

  const set = (campo, val) => {
    setForm((prev) => ({ ...prev, [campo]: val }));
    setErrores((prev) => ({ ...prev, [campo]: null }));
  };

  const validar = () => {
    const e = {};
    if (!apellido.trim()) e.apellido = "Requerido";
    if (!nombre.trim())   e.nombre   = "Requerido";
    if (!form.socDocNro.trim() || !/^\d{7,8}$/.test(form.socDocNro.trim()))
      e.socDocNro = "DNI inválido (7-8 dígitos)";
    if (!form.cliFecNac) e.cliFecNac = "Requerida";
    if (!form.pareDsc)   e.pareDsc   = "Requerido";
    return e;
  };

  const handleSubmit = () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }

    const socNom = `${apellido.trim().toUpperCase()} ${nombre.trim().toUpperCase()}`;

    onGuardar(
      {
        apellido: apellido.trim().toUpperCase(),
        nombre:   nombre.trim().toUpperCase(),
        socNom,
        socDocNro: form.socDocNro.trim(),
        cliFecNac: form.cliFecNac,
        pareDsc:   form.pareDsc,
      },
      fotoFrentePath ?? null,  // nunca undefined
      fotoDorsoPath  ?? null   // nunca undefined
    );
  };

  return (
    <div className="space-y-3">
      {/* Apellido y Nombre separados */}
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Apellido *" error={errores.apellido}>
          <input
            className={input(errores.apellido)}
            value={apellido}
            onChange={(e) => {
              setApellido(e.target.value);
              setErrores((prev) => ({ ...prev, apellido: null }));
            }}
            placeholder="GARCÍA"
            autoCapitalize="characters"
          />
        </Campo>

        <Campo label="Nombre/s *" error={errores.nombre}>
          <input
            className={input(errores.nombre)}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setErrores((prev) => ({ ...prev, nombre: null }));
            }}
            placeholder="JUAN CARLOS"
            autoCapitalize="characters"
          />
        </Campo>

        <Campo label="DNI *" error={errores.socDocNro}>
          <input
            className={input(errores.socDocNro)}
            value={form.socDocNro}
            onChange={(e) => set("socDocNro", e.target.value)}
            placeholder="12345678"
            inputMode="numeric"
            maxLength={8}
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

        <Campo label="Parentesco *" error={errores.pareDsc} fullWidth>
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

function Campo({ label, error, children, fullWidth }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Fix timezone: extrae YYYY-MM-DD sin conversión a hora local
function toInputDate(val) {
  if (!val) return "";
  try {
    const str = val?.toDate ? val.toDate().toISOString() : String(val);
    return str.split("T")[0];
  } catch {
    return "";
  }
}

function today() {
  return new Date().toISOString().split("T")[0];
}
