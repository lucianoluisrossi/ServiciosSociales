import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useLeerCodigoDNI } from "../../hooks/useLeerCodigoDNI";
import { useValidarFotoDNI } from "../../hooks/useValidarFotoDNI";
import { useToast } from "../ui/Toast";
import ScannerDNI from "../ui/ScannerDNI";

const PARENTESCOS = [
  "Cónyuge", "Hijo/a", "Padre", "Madre", "Hermano/a",
  "Abuelo/a", "Nieto/a", "Suegro/a", "Cuñado/a", "Otro",
];

const MAX_INTENTOS = 3;

const PASO = {
  BIENVENIDA: "bienvenida",
  SCANNER:    "scanner",

  MANUAL:     "manual",
  FORMULARIO: "formulario",
};

export default function NuevoAdherido({ onGuardar, onCancelar }) {
  const [paso, setPaso]               = useState(PASO.BIENVENIDA);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [mensajeError, setMensajeError] = useState(null);
  const [datosManual, setDatosManual] = useState(false);

  const [form, setForm]               = useState({ socNom: "", socDocNro: "", cliFecNac: "", pareDsc: "" });
  const [precargados, setPrecargados] = useState({});
  const [errores, setErrores]         = useState({});

  const [fotoFrentePath, setFotoFrentePath] = useState(null);
  const [subiendoFoto, setSubiendoFoto]     = useState(false);
  const inputFotoRef = useRef();

  const { procesar }  = useLeerCodigoDNI();
  const { validar }   = useValidarFotoDNI();
  const { toast, ToastContainer } = useToast();

  // ── Scanner detectó un código ────────────────────────────────────────
  const handleDetectado = (texto) => {
    const resultado = procesar(texto);

    if (!resultado.ok) {
      const nuevosIntentos = intentosFallidos + 1;
      setIntentosFallidos(nuevosIntentos);
      if (nuevosIntentos >= MAX_INTENTOS) {
        setDatosManual(true);
        setPaso(PASO.MANUAL);
      } else {
        setMensajeError(`${resultado.error} (intento ${nuevosIntentos} de ${MAX_INTENTOS})`);
        setPaso(PASO.SCANNER);
      }
      return;
    }

    const nuevasPrecarga = {};
    const nuevoForm = { socNom: "", socDocNro: "", cliFecNac: "", pareDsc: "" };
    const d = resultado.datos;
    if (d.socNom)    { nuevoForm.socNom    = d.socNom;                    nuevasPrecarga.socNom    = true; }
    if (d.socDocNro) { nuevoForm.socDocNro = d.socDocNro;                 nuevasPrecarga.socDocNro = true; }
    if (d.cliFecNac) { const f = toInputDate(d.cliFecNac); if (f) { nuevoForm.cliFecNac = f; nuevasPrecarga.cliFecNac = true; } }

    setForm(nuevoForm);
    setPrecargados(nuevasPrecarga);
    setDatosManual(false);
    setMensajeError(null);
    setPaso(PASO.FORMULARIO);
  };

  const handleErrorScanner = (msg) => {
    setMensajeError(msg);
  };

  const handleCancelarScanner = () => {
    setPaso(PASO.BIENVENIDA);
    setMensajeError(null);
  };

  // ── Subir foto (modo manual) ──────────────────────────────────────────
  const handleSubirFoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setSubiendoFoto(true);
    try {
      let resultado;
      try { resultado = await validar(file, "frente"); }
      catch { toast("No se pudo verificar la foto.", "advertencia"); setSubiendoFoto(false); return; }
      if (!resultado.ok) { toast(resultado.mensaje, "error"); setSubiendoFoto(false); return; }

      const auth = getAuth();
      const user = auth.currentUser;
      const tokenResult = await user.getIdTokenResult();
      const dniAsociado = tokenResult.claims.dni;
      const dniAdherido = form.socDocNro || `temp_${Date.now()}`;
      const storage = getStorage();
      const path = `solicitudes/${dniAsociado}/${dniAdherido}/frente_${Date.now()}.jpg`;
      await uploadBytes(ref(storage, path), file, { contentType: file.type });
      setFotoFrentePath(path);

      if (resultado.datos) {
        setForm((prev) => ({
          socNom:    prev.socNom    || resultado.datos.socNom    || "",
          socDocNro: prev.socDocNro || resultado.datos.socDocNro || "",
          cliFecNac: prev.cliFecNac || toInputDate(resultado.datos.cliFecNac) || "",
          pareDsc:   prev.pareDsc,
        }));
      }
    } catch (err) {
      console.error(err);
      toast("No se pudo subir la foto.", "error");
    } finally {
      setSubiendoFoto(false);
    }
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
    if (datosManual && !fotoFrentePath)
      e.fotoFrente = "Requerida cuando los datos son ingresados manualmente";
    return e;
  };

  const handleSubmit = () => {
    const e = validarForm();
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    onGuardar({ ...form, socDocNro: form.socDocNro.trim(), datosManual }, fotoFrentePath, null);
  };

  const hayPrecargados = Object.values(precargados).some(Boolean);

  return (
    <>
      <ToastContainer />

      {/* BIENVENIDA */}
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
            <p className="text-xs text-blue-700">📷 Abrimos la cámara</p>
            <p className="text-xs text-blue-700">🔍 Apuntás al código del DNI</p>
            <p className="text-xs text-blue-700">✨ Los datos se completan solos</p>
          </div>
          {mensajeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-left">
              <p className="text-xs text-red-700">{mensajeError}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onCancelar}
              className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={() => { setMensajeError(null); setPaso(PASO.SCANNER); }}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
              📷 Escanear DNI
            </button>
          </div>
        </div>
      )}

      {/* SCANNER */}
      {paso === PASO.SCANNER && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Escaneá el código del DNI</p>
            <p className="text-xs text-gray-500 mt-0.5">Código de barras del dorso o QR del frente</p>
          </div>
          {mensajeError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">{mensajeError}</p>
            </div>
          )}
          <ScannerDNI
            onDetectado={handleDetectado}
            onError={handleErrorScanner}
            onCancelar={handleCancelarScanner}
          />
        </div>
      )}
      {/* MANUAL */}
      {paso === PASO.MANUAL && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-amber-800">Ingreso manual</p>
            <p className="text-xs text-amber-700 mt-0.5">
              No se pudo leer el código. Ingresá los datos y adjuntá una foto del frente.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Apellido y nombre *" error={errores.socNom}>
              <input className={inputClass(errores.socNom, false)} value={form.socNom}
                onChange={(e) => set("socNom", e.target.value)} placeholder="García Juan" />
            </Campo>
            <Campo label="DNI *" error={errores.socDocNro}>
              <input className={inputClass(errores.socDocNro, false)} value={form.socDocNro}
                onChange={(e) => set("socDocNro", e.target.value)} placeholder="12345678" />
            </Campo>
            <Campo label="Fecha de nacimiento *" error={errores.cliFecNac}>
              <input type="date" className={inputClass(errores.cliFecNac, false)}
                value={form.cliFecNac} onChange={(e) => set("cliFecNac", e.target.value)} max={today()} />
            </Campo>
            <Campo label="Parentesco *" error={errores.pareDsc}>
              <select className={inputClass(errores.pareDsc, false)} value={form.pareDsc}
                onChange={(e) => set("pareDsc", e.target.value)}>
                <option value="">Seleccionar...</option>
                {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Campo>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">
              📷 Foto del frente del DNI <span className="text-red-500">*</span>
            </p>
            <input ref={inputFotoRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleSubirFoto} />
            {fotoFrentePath ? (
              <div className="border-2 border-green-400 bg-green-50 rounded-xl p-3 flex items-center gap-2">
                <span>✅</span>
                <span className="text-xs text-green-700 font-medium">Foto cargada</span>
                <button onClick={() => setFotoFrentePath(null)}
                  className="ml-auto text-xs text-gray-400 hover:text-red-500">Quitar</button>
              </div>
            ) : (
              <button type="button" onClick={() => inputFotoRef.current?.click()}
                disabled={subiendoFoto}
                className={`w-full border-2 border-dashed rounded-xl p-3 flex items-center gap-2 text-xs transition-all disabled:opacity-60
                  ${errores.fotoFrente ? "border-red-400 bg-red-50" : "border-gray-300 bg-gray-50 hover:border-blue-400"}`}>
                {subiendoFoto
                  ? <><Spinner small /><span className="text-gray-500">Procesando...</span></>
                  : <><span className="text-xl">📷</span><span className="text-gray-500">Fotografiar frente del DNI</span></>}
              </button>
            )}
            {errores.fotoFrente && <p className="text-xs text-red-500 mt-1">{errores.fotoFrente}</p>}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setPaso(PASO.BIENVENIDA); setIntentosFallidos(0); }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Volver</button>
            <button onClick={handleSubmit}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Agregar familiar
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO */}
      {paso === PASO.FORMULARIO && (
        <div className="space-y-3">
          {hayPrecargados && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-xs text-green-700">Datos leídos del DNI. Revisalos y completá el parentesco.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Apellido y nombre" error={errores.socNom} precargado={precargados.socNom}>
              <input className={inputClass(errores.socNom, precargados.socNom)}
                value={form.socNom} onChange={(e) => set("socNom", e.target.value)} />
            </Campo>
            <Campo label="DNI" error={errores.socDocNro} precargado={precargados.socDocNro}>
              <input className={inputClass(errores.socDocNro, precargados.socDocNro)}
                value={form.socDocNro} onChange={(e) => set("socDocNro", e.target.value)} />
            </Campo>
            <Campo label="Fecha de nacimiento" error={errores.cliFecNac} precargado={precargados.cliFecNac}>
              <input type="date" className={inputClass(errores.cliFecNac, precargados.cliFecNac)}
                value={form.cliFecNac} onChange={(e) => set("cliFecNac", e.target.value)} max={today()} />
            </Campo>
            <Campo label="Parentesco *" error={errores.pareDsc}>
              <select className={inputClass(errores.pareDsc, false)}
                value={form.pareDsc} onChange={(e) => set("pareDsc", e.target.value)}>
                <option value="">Seleccionar...</option>
                {PARENTESCOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Campo>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onCancelar}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button onClick={handleSubmit}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
  if (precargado) return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-green-300 bg-green-50";
  return "w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300";
}

function Campo({ label, error, precargado, children }) {
  return (
    <div className="relative">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
      {precargado && <span className="absolute top-0 right-0 text-green-500 text-xs px-1" title="Leído del DNI">✅</span>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function Spinner({ small }) {
  const size = small ? "w-4 h-4" : "w-8 h-8";
  return (
    <svg className={`animate-spin text-blue-500 ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
