import { useState } from "react";

/**
 * La API devuelve SocNom como "APELLIDO NOMBRE" (todo mayúsculas, concatenado).
 * Estrategia de split: la primera palabra es el apellido, el resto es el nombre.
 */
function splitNombreApellido(socNom = "") {
  const partes = socNom.trim().split(/\s+/);
  if (partes.length === 0) return { apellido: "", nombre: "" };
  if (partes.length === 1) return { apellido: partes[0], nombre: "" };
  return {
    apellido: partes[0],
    nombre: partes.slice(1).join(" "),
  };
}

const PARENTESCOS = [
  "Cónyuge",
  "Hijo/a",
  "Padre",
  "Madre",
  "Hermano/a",
  "Otro",
];

export default function FormAdherido({ adherido, onGuardar, onCancelar }) {
  const inicial = splitNombreApellido(adherido?.socNom);

  const [apellido, setApellido] = useState(inicial.apellido);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [dni, setDni] = useState(adherido?.socDocNro ?? "");
  const [fechaNac, setFechaNac] = useState(formatearFechaInput(adherido?.cliFecNac));
  const [parentesco, setParentesco] = useState(adherido?.pareDsc ?? "");
  const [errores, setErrores] = useState({});

  const esNuevo = !adherido;

  function validar() {
    const e = {};
    if (!apellido.trim()) e.apellido = "El apellido es obligatorio.";
    if (!nombre.trim()) e.nombre = "El nombre es obligatorio.";
    if (!dni.trim() || !/^\d{7,8}$/.test(dni.trim()))
      e.dni = "Ingresá un DNI válido (7 u 8 dígitos).";
    if (!fechaNac) e.fechaNac = "La fecha de nacimiento es obligatoria.";
    if (!parentesco) e.parentesco = "Seleccioná un parentesco.";
    return e;
  }

  function handleGuardar() {
    const e = validar();
    if (Object.keys(e).length > 0) {
      setErrores(e);
      return;
    }

    onGuardar({
      apellido: apellido.trim().toUpperCase(),
      nombre: nombre.trim().toUpperCase(),
      socNom: `${apellido.trim().toUpperCase()} ${nombre.trim().toUpperCase()}`,
      socDocNro: dni.trim(),
      cliFecNac: fechaNac,
      pareDsc: parentesco,
      ...(adherido?.id ? { id: adherido.id } : {}),
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-base font-semibold text-gray-800 mb-4">
        {esNuevo ? "Agregar familiar" : "Editar familiar"}
      </h3>

      <div className="space-y-4">
        {/* Apellido y Nombre en fila */}
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Apellido"
            value={apellido}
            onChange={(v) => {
              setApellido(v);
              setErrores((e) => ({ ...e, apellido: undefined }));
            }}
            error={errores.apellido}
            placeholder="GARCÍA"
            autoCapitalize="characters"
          />
          <Campo
            label="Nombre/s"
            value={nombre}
            onChange={(v) => {
              setNombre(v);
              setErrores((e) => ({ ...e, nombre: undefined }));
            }}
            error={errores.nombre}
            placeholder="JUAN CARLOS"
            autoCapitalize="characters"
          />
        </div>

        {/* DNI */}
        <Campo
          label="DNI"
          value={dni}
          onChange={(v) => {
            setDni(v);
            setErrores((e) => ({ ...e, dni: undefined }));
          }}
          error={errores.dni}
          placeholder="12345678"
          inputMode="numeric"
          maxLength={8}
        />

        {/* Fecha de nacimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={fechaNac}
            onChange={(e) => {
              setFechaNac(e.target.value);
              setErrores((prev) => ({ ...prev, fechaNac: undefined }));
            }}
            max={hoy()}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errores.fechaNac ? "border-red-400" : "border-gray-300"
            }`}
          />
          {errores.fechaNac && (
            <p className="text-xs text-red-500 mt-1">{errores.fechaNac}</p>
          )}
        </div>

        {/* Parentesco */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Parentesco
          </label>
          <select
            value={parentesco}
            onChange={(e) => {
              setParentesco(e.target.value);
              setErrores((prev) => ({ ...prev, parentesco: undefined }));
            }}
            className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errores.parentesco ? "border-red-400" : "border-gray-300"
            }`}
          >
            <option value="">Seleccioná...</option>
            {PARENTESCOS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {errores.parentesco && (
            <p className="text-xs text-red-500 mt-1">{errores.parentesco}</p>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleGuardar}
          className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {esNuevo ? "Agregar" : "Guardar"}
        </button>
        <button
          onClick={onCancelar}
          className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, error, placeholder, inputMode, maxLength, autoCapitalize }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? "border-red-400" : "border-gray-300"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Fix timezone: extrae YYYY-MM-DD del string ISO sin convertir a hora local
function formatearFechaInput(fecha) {
  if (!fecha) return "";
  try {
    const str = fecha?.toDate ? fecha.toDate().toISOString() : String(fecha);
    return str.split("T")[0];
  } catch {
    return "";
  }
}

function hoy() {
  return new Date().toISOString().split("T")[0];
}
