import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useValidarFotoDNI } from "../../hooks/useValidarFotoDNI";
import { useToast } from "../ui/Toast";
import SubirDNI from "./SubirDNI";

const PARENTESCOS = [
  "Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a",
  "Abuelo/a", "Nieto/a", "Suegro/a", "Cuñado/a", "Otro",
];

// Pasos del flujo
const PASO = {
  BIENVENIDA: "bienvenida",
  ESCANEANDO: "escaneando",
  FORMULARIO: "formulario",
};

export default function NuevoAdherido({ onGuardar, onCancelar }) {
  const [paso, setPaso]                     = useState(PASO.BIENVENIDA);
  const [escaneando, setEscaneando]         = useState(false);
  const [errorEscaneo, setErrorEscaneo]     = useState(null);
  const [fotoFrentePath, setFotoFrentePath] = useState(null);
  const [fotoDorsoPath, setFotoDorsoPath]   = useState(null);
  const [form, setForm]                     = useState({
    socNom: "", socDocNro: "", cliFecNac: "", pareDsc: "",
  });
  const [precargados, setPrecargados]       = useState({});
  const [errores, setErrores]               = useState({});

  const inputRef = useRef();
  const { validar } = useValidarFotoDNI();
  const { toast, ToastContainer } = useToast();

  // ── Escaneo del frente ─────────────────────────────────────────────────
  const handleFrenteChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setErrorEscaneo(null);
    setEscaneando(true);

    let resultado;
    try {
      resultado = await validar(file, "frente");
    } catch {
      setEscaneando(false);
      setErrorEscaneo("El servicio de validación no está disponible. Revisá tu conexión.");
      return;
    }

    if (!resultado.ok) {
      setEscaneando(false);
      setErrorEscaneo(resultado.mensaje);
      return;
    }

    // Subir foto a Storage
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const tokenResult = await user.getIdTokenResult();
      const dniAsociado = tokenResult.claims.dni;
      const dniAdherido = resultado.datos?.socDocNro || `temp_${Date.now()}`;

      const storage = getStorage();
      const path = `solicitudes/${dniAsociado}/${dniAdherido}/frente_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      setFotoFrentePath(path);
    } catch {
      // Si falla la subida no bloqueamos — la foto es opcional
    }

    // Precargar datos en el formulario
    const nuevasPrecarga = {};
    const nuevoForm = { socNom: "", socDocNro: "", cliFecNac: "", pareDsc: "" };

    if (resultado.datos?.socNom)    { nuevoForm.socNom    = resultado.datos.socNom;    nuevasPrecarga.socNom    = true; }
    if (resultado.datos?.socDocNro) { nuevoForm.socDocNro = resultado.datos.socDocNro; nuevasPrecarga.socDocNro = true; }
    if (resultado.datos?.cliFecNac) {
      const fecha = toInputDate(resultado.datos.cliFecNac);
      if (fecha) { nuevoForm.cliFecNac = fecha; nuevasPrecarga.cliFecNac = true; }
    }

    setForm(nuevoForm);
    setPrecargados(nuevasPrecarga);
    setEscaneando(false);
    setPaso(PASO.FORMULARIO);
  };

  const handleDatosExtraidos = (datos) => {
    if (!datos?.cliFecNac) return;
    const fecha = toInputDate(datos.cliFecNac);
    if (!fecha) return;
    setForm((prev) => {
      if (prev.cliFecNac) return prev; // no sobreescribir
      return { ...prev, cliFecNac: fecha };
    });
    setPrecargados((prev) => ({ ...prev, cliFecNac: true }));
  };

  const set = (campo, val) => {
    setForm((prev) => ({ ...prev, [campo]: val }));
    setErrores((prev) => ({ ...prev, [campo]: null }));
    setPrecargados((prev) => ({ ...prev, [campo]: false }));
  };

  const validarForm = () => {
    const e = {};
    if (!form.socNom.trim())    e.socNom = "Requerido";
    if (!form.socDocNro.trim() || !/^\d{7,8}$/.test(form.socDocNro.trim()))
      e.socDocNro = "DNI inválido (7-8 dígitos)";
    if (!form.cliFecNac)        e.cliFecNac = "Requerida";
    if (!form.pareDsc)          e.pareDsc = "Requerido";
    return e;
  };

  const handleSubmit = () => {
    const e = validarForm();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    onGuardar({ ...form, socDocNro: form.socDocNro.trim() }, fotoFrentePath, fotoDorsoPath);
  };

  const hayPrecargados = Object.values(precargados).some(Boolean);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer />

      {/* PASO 1: Bienvenida */}
      {paso === PASO.BIENVENIDA && (
        <div className="text-center py-2 space-y-4">
          <div>
            <p className="text-3xl mb-2">🪪</p>
            <p className="text-sm font-semibold text-gray-800">Agregar familiar</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Vamos a leer los datos del DNI automáticamente.<br />
              <span className="font-medium text-gray-700">Tené el DNI del familiar a mano.</span>
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-left space-y-1.5">
            <p className="text-xs font-semibold text-blue-800">¿Cómo funciona?</p>
            <p className="text-xs text-blue-700">📷 Sacás una foto del frente del DNI</p>
            <p className="text-xs text-blue-700">✨ Los datos se completan solos</p>
            <p className="text-xs text-blue-700">✏️ Revisás y completás el parentesco</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancelar}
              className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => setPaso(PASO.ESCANEANDO)}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              📷 Escanear DNI
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Escaneo del frente */}
      {paso === PASO.ESCANEANDO && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Frente del DNI</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Apuntá la cámara al frente y asegurate de que se vea completo
            </p>
          </div>

          {/* Botón de captura */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFrenteChange}
          />

          <button
            type="button"
            onClick={() => { setErrorEscaneo(null); inputRef.current?.click(); }}
            disabled={escaneando}
            className={`
              w-full border-2 border-dashed rounded-xl p-6
              flex flex-col items-center gap-2
              transition-all duration-200
              disabled:opacity-60 disabled:cursor-not-allowed
              ${errorEscaneo
                ? "border-red-300 bg-red-50 hover:bg-red-100"
                : "border-blue-300 bg-blue-50 hover:bg-blue-100"
              }
            `}
          >
            {escaneando ? (
              <>
                <Spinner />
                <p className="text-sm font-medium text-blue-700">Leyendo documento...</p>
                <p className="text-xs text-blue-500">Esto puede tardar unos segundos</p>
              </>
            ) : errorEscaneo ? (
              <>
                <span className="text-3xl">📷</span>
                <p className="text-sm font-medium text-red-600">Intentar de nuevo</p>
              </>
            ) : (
              <>
                <span className="text-4xl">📄</span>
                <p className="text-sm font-medium text-blue-700">Fotografiar frente del DNI</p>
                <p className="text-xs text-blue-500">✨ Los datos se van a completar solos</p>
              </>
            )}
          </button>

          {/* Error de escaneo */}
          {errorEscaneo && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700">{errorEscaneo}</p>
            </div>
          )}

          {/* Opción de ingresar manualmente */}
          <div className="text-center pt-1">
            <button
              onClick={() => setPaso(PASO.FORMULARIO)}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Ingresar datos manualmente
            </button>
          </div>

          <button
            onClick={onCancelar}
            className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* PASO 3: Formulario (precargado o manual) */}
      {paso === PASO.FORMULARIO && (
        <div className="space-y-3">
          {/* Aviso de datos precargados */}
          {hayPrecargados && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span className="text-blue-500 mt-0.5">✨</span>
              <p className="text-xs text-blue-700">
                Datos completados desde el DNI. Revisalos antes de continuar.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Apellido y nombre *" error={errores.socNom} precargado={precargados.socNom}>
              <input
                className={inputClass(errores.socNom, precargados.socNom)}
                value={form.socNom}
                onChange={(e) => set("socNom", e.target.value)}
                placeholder="García Juan"
              />
            </Campo>

            <Campo label="DNI *" error={errores.socDocNro} precargado={precargados.socDocNro}>
              <input
                className={inputClass(errores.socDocNro, precargados.socDocNro)}
                value={form.socDocNro}
                onChange={(e) => set("socDocNro", e.target.value)}
                placeholder="12345678"
              />
            </Campo>

            <Campo label="Fecha de nacimiento *" error={errores.cliFecNac} precargado={precargados.cliFecNac}>
              <input
                type="date"
                className={inputClass(errores.cliFecNac, precargados.cliFecNac)}
                value={form.cliFecNac}
                onChange={(e) => set("cliFecNac", e.target.value)}
                max={today()}
              />
            </Campo>

            <Campo label="Parentesco *" error={errores.pareDsc}>
              <select
                className={inputClass(errores.pareDsc, false)}
                value={form.pareDsc}
                onChange={(e) => set("pareDsc", e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Campo>
          </div>

          {/* Fotos DNI */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">
              Foto del DNI <span className="text-gray-400">(opcional)</span>
              {fotoFrentePath
                ? <span className="text-green-600 ml-1">· frente ya cargado ✓</span>
                : <span className="text-blue-500 ml-1">· el dorso puede completar la fecha</span>
              }
            </p>
            <div className="grid grid-cols-2 gap-3">
              {fotoFrentePath ? (
                <div className="border-2 border-green-400 bg-green-50 rounded-xl p-3 flex flex-col items-center gap-1 text-xs">
                  <span className="text-2xl">✅</span>
                  <span className="text-green-700 font-medium">Frente cargado</span>
                </div>
              ) : (
                <SubirDNI
                  label="Frente"
                  dni={form.socDocNro}
                  lado="frente"
                  onSubido={setFotoFrentePath}
                  onDatosExtraidos={(datos) => {
                    if (!datos) return;
                    const nuevasPrecarga = {};
                    if (datos.socNom)    { set("socNom",    datos.socNom);                    nuevasPrecarga.socNom    = true; }
                    if (datos.socDocNro) { set("socDocNro", datos.socDocNro);                 nuevasPrecarga.socDocNro = true; }
                    if (datos.cliFecNac) { const f = toInputDate(datos.cliFecNac); if (f) { set("cliFecNac", f); nuevasPrecarga.cliFecNac = true; } }
                    setPrecargados((prev) => ({ ...prev, ...nuevasPrecarga }));
                  }}
                />
              )}
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
              Agregar familiar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function inputClass(err, precargado) {
  if (err)        return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-red-400 bg-red-50";
  if (precargado) return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-blue-300 bg-blue-50";
  return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300";
}

function Campo({ label, error, precargado, children }) {
  return (
    <div className="relative">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
      {precargado && (
        <span className="absolute top-0 right-0 text-blue-400 text-xs px-1" title="Completado desde el DNI">✨</span>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin text-blue-500 w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
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
