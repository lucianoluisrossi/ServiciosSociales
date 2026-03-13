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
  const [errores, setErrores]               = useState({});
  // Campos precargados desde el DNI (para resaltarlos visualmente)
  const [precargados, setPrecargados]       = useState({});

  const esEdicion = !!inicial;

  const set = (campo, val, esPrecarga = false) => {
    setForm((prev) => ({ ...prev, [campo]: val }));
    setErrores((prev) => ({ ...prev, [campo]: null }));
    if (!esPrecarga) {
      // Si el usuario edita manualmente, quitar el indicador de precarga
      setPrecargados((prev) => ({ ...prev, [campo]: false }));
    }
  };

  const handleDatosExtraidos = (datos) => {
    if (!datos) return;
    const nuevasPrecarga = {};

    if (datos.socNom) {
      setForm((prev) => ({ ...prev, socNom: datos.socNom }));
      nuevasPrecarga.socNom = true;
    }
    if (datos.socDocNro) {
      setForm((prev) => ({ ...prev, socDocNro: datos.socDocNro }));
      nuevasPrecarga.socDocNro = true;
    }
    if (datos.cliFecNac) {
      const fecha = toInputDate(datos.cliFecNac);
      if (fecha) {
        // Solo precargar fecha del dorso si el campo está vacío (no sobreescribir lo que ya tiene)
        setForm((prev) => {
          if (prev.cliFecNac) return prev;
          return { ...prev, cliFecNac: fecha };
        });
        nuevasPrecarga.cliFecNac = true;
      }
    }
    setPrecargados((prev) => ({ ...prev, ...nuevasPrecarga }));
    setErrores({});
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

  const hayPrecargados = Object.values(precargados).some(Boolean);

  return (
    <div className="space-y-3">
      {/* Aviso de datos precargados */}
      {hayPrecargados && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <span className="text-blue-500 mt-0.5">✨</span>
          <p className="text-xs text-blue-700">
            Datos completados automáticamente desde el DNI. Revisalos antes de continuar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Apellido y nombre *" error={errores.socNom}>
          <input
            className={inputClass(errores.socNom, precargados.socNom)}
            value={form.socNom}
            onChange={(e) => set("socNom", e.target.value)}
            placeholder="García Juan"
          />
          {precargados.socNom && <Precargado />}
        </Campo>

        <Campo label="DNI *" error={errores.socDocNro}>
          <input
            className={inputClass(errores.socDocNro, precargados.socDocNro)}
            value={form.socDocNro}
            onChange={(e) => set("socDocNro", e.target.value)}
            placeholder="12345678"
          />
          {precargados.socDocNro && <Precargado />}
        </Campo>

        <Campo label="Fecha de nacimiento *" error={errores.cliFecNac}>
          <input
            type="date"
            className={inputClass(errores.cliFecNac, precargados.cliFecNac)}
            value={form.cliFecNac}
            onChange={(e) => set("cliFecNac", e.target.value)}
            max={today()}
          />
          {precargados.cliFecNac && <Precargado />}
        </Campo>

        <Campo label="Parentesco *" error={errores.pareDsc}>
          <select
            className={inputClass(errores.pareDsc, false)}
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
          Foto del DNI{" "}
          <span className="text-gray-400">(opcional pero recomendado)</span>
          {!esEdicion && (
            <span className="text-blue-500 ml-1">· el frente completa los datos automáticamente</span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <SubirDNI
            label="Frente"
            dni={form.socDocNro}
            lado="frente"
            onSubido={setFotoFrentePath}
            onDatosExtraidos={handleDatosExtraidos}
          />
          <SubirDNI
            label="Dorso"
            dni={form.socDocNro}
            lado="dorso"
            onSubido={setFotoDorsoPath}
            onDatosExtraidos={handleDatosExtraidos}
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

/** Clases del input según estado: error, precargado, o normal */
function inputClass(err, precargado) {
  if (err)        return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-red-400 bg-red-50";
  if (precargado) return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-300 bg-blue-50";
  return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300";
}

function Campo({ label, error, children }) {
  return (
    <div className="relative">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

/** Indicador visual de campo precargado desde el DNI */
function Precargado() {
  return (
    <span className="absolute top-0 right-0 text-blue-400 text-xs px-1" title="Completado desde el DNI">
      ✨
    </span>
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
