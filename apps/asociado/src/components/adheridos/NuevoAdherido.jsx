import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useLeerCodigoDNI } from "../../hooks/useLeerCodigoDNI";
import { useValidarFotoDNI } from "../../hooks/useValidarFotoDNI";
import { useToast } from "../ui/Toast";
import ScannerDNI from "../ui/ScannerDNI";

const PARENTESCOS = [
  "Cónyuge", "Concubino/a", "Hijo/a", "Padre", "Madre", "Hermano/a",
  "Abuelo/a", "Nieto/a", "Suegro/a", "Cuñado/a", "Otro",
];

const MAX_INTENTOS = 3;

const PASO = {
  INSTRUCCIONES: "instrucciones",
  SCANNER:       "scanner",
  DATOS:         "datos",
  MANUAL:        "manual",
  PARENTESCO:    "parentesco",
};

const NUMERO_PASO = {
  [PASO.INSTRUCCIONES]: 1,
  [PASO.SCANNER]:       2,
  [PASO.DATOS]:         3,
  [PASO.MANUAL]:        3,
  [PASO.PARENTESCO]:    4,
};

export default function NuevoAdherido({ onGuardar, onCancelar }) {
  const [paso, setPaso]                         = useState(PASO.INSTRUCCIONES);
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [editandoDatos, setEditandoDatos]       = useState(false);
  const [datosManual, setDatosManual]           = useState(false);

  const [form, setForm]       = useState({ socNom: "", socDocNro: "", cliFecNac: "", pareDsc: "" });
  const [errores, setErrores] = useState({});

  const [fotoFrentePath, setFotoFrentePath] = useState(null);
  const [subiendoFoto, setSubiendoFoto]     = useState(false);
  const inputFotoRef = useRef();

  const { procesar }           = useLeerCodigoDNI();
  const { validar }            = useValidarFotoDNI();
  const { toast, ToastContainer } = useToast();

  const numeroPaso = NUMERO_PASO[paso] ?? 1;

  const set = (campo, val) => {
    setForm((prev) => ({ ...prev, [campo]: val }));
    setErrores((prev) => ({ ...prev, [campo]: null, submit: null }));
  };

  // ── Scanner ──────────────────────────────────────────────────────────────
  const handleDetectado = (texto) => {
    const resultado = procesar(texto);
    if (!resultado.ok) {
      const nuevos = intentosFallidos + 1;
      setIntentosFallidos(nuevos);
      if (nuevos >= MAX_INTENTOS) {
        setDatosManual(true);
        setPaso(PASO.MANUAL);
      } else {
        setPaso(PASO.SCANNER);
      }
      return;
    }
    const nuevoForm = { socNom: "", socDocNro: "", cliFecNac: "", pareDsc: "" };
    const d = resultado.datos;
    if (d.socNom)    nuevoForm.socNom    = d.socNom;
    if (d.socDocNro) nuevoForm.socDocNro = d.socDocNro;
    if (d.cliFecNac) { const f = toInputDate(d.cliFecNac); if (f) nuevoForm.cliFecNac = f; }
    setForm(nuevoForm);
    setDatosManual(false);
    setEditandoDatos(false);
    setErrores({});
    setPaso(PASO.DATOS);
  };

  // ── Foto manual ──────────────────────────────────────────────────────────
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
      const tokenResult = await auth.currentUser.getIdTokenResult();
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
    } catch { toast("No se pudo subir la foto.", "error"); }
    finally   { setSubiendoFoto(false); }
  };

  // ── Validar y continuar al paso de parentesco ────────────────────────────
  const handleContinuarDatos = () => {
    const e = {};
    if (!form.socNom.trim())                                       e.socNom    = "Requerido";
    if (!/^\d{7,8}$/.test(form.socDocNro.trim()))                 e.socDocNro = "7 u 8 dígitos";
    if (!form.cliFecNac)                                           e.cliFecNac = "Requerida";
    if (datosManual && !fotoFrentePath)                            e.fotoFrente = "Requerida";
    if (Object.keys(e).length > 0) { setErrores(e); return; }
    setPaso(PASO.PARENTESCO);
  };

  // ── Enviar ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!form.pareDsc) { setErrores({ pareDsc: "Seleccioná un parentesco" }); return; }
    const result = onGuardar(
      { ...form, socDocNro: form.socDocNro.trim(), datosManual },
      fotoFrentePath,
      null,
    );
    if (result && !result.ok) {
      setErrores({ submit: result.error });
    }
  };

  // ── Navegación atrás ─────────────────────────────────────────────────────
  const handleAtras = () => {
    if (paso === PASO.INSTRUCCIONES) { onCancelar(); return; }
    if (paso === PASO.SCANNER)       { setPaso(PASO.INSTRUCCIONES); return; }
    if (paso === PASO.DATOS)         { setPaso(PASO.SCANNER); return; }
    if (paso === PASO.MANUAL)        { setIntentosFallidos(0); setPaso(PASO.INSTRUCCIONES); return; }
    if (paso === PASO.PARENTESCO)    { setPaso(datosManual ? PASO.MANUAL : PASO.DATOS); return; }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <ToastContainer />

      {/* Header con barra de progreso */}
      <div className="shrink-0 border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleAtras}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-xl shrink-0"
        >
          ←
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 font-medium mb-1.5">Agregar familiar</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-all ${
                  n < numeroPaso  ? "bg-blue-400 flex-1" :
                  n === numeroPaso ? "bg-blue-600 flex-[2]" :
                  "bg-gray-200 flex-1"
                }`}
              />
            ))}
          </div>
        </div>
        <span className="text-xs text-gray-400 font-semibold shrink-0">{numeroPaso}/4</span>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Paso 1: Instrucciones ── */}
        {paso === PASO.INSTRUCCIONES && (
          <div className="px-5 py-6 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">🪪</div>
              <h2 className="text-2xl font-bold text-gray-900">Agregar familiar</h2>
              <p className="text-base text-gray-500 mt-2 leading-relaxed">
                Usamos la cámara para leer el código del DNI y completar los datos automáticamente.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <p className="text-sm font-bold text-amber-800">📋 Antes de continuar</p>
              <p className="text-sm text-amber-700 mt-1">
                Tené en mano el <strong>DNI físico</strong> del familiar que querés agregar.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icono: "📷", titulo: "Abrimos la cámara",          desc: "Apuntá al código de barras o QR del DNI." },
                { icono: "🔍", titulo: "Escaneamos el código",        desc: "Mantené el DNI quieto y bien iluminado. El sistema lo detecta solo." },
                { icono: "✅", titulo: "Los datos se completan solos", desc: "Nombre, DNI y fecha de nacimiento se cargan automáticamente." },
              ].map(({ icono, titulo, desc }) => (
                <div key={titulo} className="flex items-start gap-4 bg-blue-50 rounded-2xl px-4 py-3">
                  <span className="text-2xl shrink-0">{icono}</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">{titulo}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-1">
              <button
                onClick={() => setPaso(PASO.SCANNER)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
              >
                📷 Escanear DNI
              </button>
              <button
                onClick={() => { setDatosManual(true); setPaso(PASO.MANUAL); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-2"
              >
                Ingresar datos manualmente
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 2: Scanner ── */}
        {paso === PASO.SCANNER && (
          <ScannerDNI
            key={intentosFallidos}
            onDetectado={handleDetectado}
            onError={() => { setDatosManual(true); setPaso(PASO.MANUAL); }}
            onCancelar={() => setPaso(PASO.INSTRUCCIONES)}
          />
        )}

        {/* ── Paso 3a: Datos extraídos del DNI ── */}
        {paso === PASO.DATOS && (
          <div className="px-5 py-6 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-2xl font-bold text-gray-900">DNI escaneado</h2>
              <p className="text-sm text-gray-500 mt-1">Revisá que los datos sean correctos.</p>
            </div>

            {!editandoDatos ? (
              <div className="space-y-3">
                <DatoCard label="Apellido y nombre" valor={form.socNom} />
                <DatoCard label="DNI"               valor={form.socDocNro} />
                <DatoCard label="Fecha de nacimiento" valor={formatFecha(form.cliFecNac)} />
                <button
                  onClick={() => setEditandoDatos(true)}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 py-2 underline"
                >
                  ¿Hay un error? Tocá aquí para corregir
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <CampoEdit label="Apellido y nombre *" error={errores.socNom}>
                  <input className={inputClass(errores.socNom)} value={form.socNom}
                    onChange={(e) => set("socNom", e.target.value)} />
                </CampoEdit>
                <CampoEdit label="DNI *" error={errores.socDocNro}>
                  <input className={inputClass(errores.socDocNro)} value={form.socDocNro}
                    inputMode="numeric"
                    onChange={(e) => set("socDocNro", e.target.value.replace(/\D/g, ""))} />
                </CampoEdit>
                <CampoEdit label="Fecha de nacimiento *" error={errores.cliFecNac}>
                  <input type="date" className={inputClass(errores.cliFecNac)}
                    value={form.cliFecNac} onChange={(e) => set("cliFecNac", e.target.value)} max={today()} />
                </CampoEdit>
              </div>
            )}

            <button
              onClick={handleContinuarDatos}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ── Paso 3b: Ingreso manual ── */}
        {paso === PASO.MANUAL && (
          <div className="px-5 py-6 space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">✏️</div>
              <h2 className="text-2xl font-bold text-gray-900">Ingreso manual</h2>
              <p className="text-sm text-gray-500 mt-1">
                {intentosFallidos > 0
                  ? "No pudimos leer el código del DNI. Ingresá los datos manualmente y adjuntá una foto del frente del DNI."
                  : "Ingresá los datos del familiar manualmente."}
              </p>
            </div>

            <div className="space-y-3">
              <CampoEdit label="Apellido y nombre *" error={errores.socNom}>
                <input className={inputClass(errores.socNom)} value={form.socNom}
                  onChange={(e) => set("socNom", e.target.value)} placeholder="García Juan" />
              </CampoEdit>
              <CampoEdit label="DNI *" error={errores.socDocNro}>
                <input className={inputClass(errores.socDocNro)} value={form.socDocNro}
                  inputMode="numeric" placeholder="12345678"
                  onChange={(e) => set("socDocNro", e.target.value.replace(/\D/g, ""))} />
              </CampoEdit>
              <CampoEdit label="Fecha de nacimiento *" error={errores.cliFecNac}>
                <input type="date" className={inputClass(errores.cliFecNac)}
                  value={form.cliFecNac} onChange={(e) => set("cliFecNac", e.target.value)} max={today()} />
              </CampoEdit>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foto del frente del DNI <span className="text-red-500">*</span>
              </p>
              <input ref={inputFotoRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={handleSubirFoto} />
              {fotoFrentePath ? (
                <div className="border-2 border-green-400 bg-green-50 rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-sm text-green-700 font-medium flex-1">Foto cargada</span>
                  <button onClick={() => setFotoFrentePath(null)} className="text-xs text-gray-400 hover:text-red-500">
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputFotoRef.current?.click()}
                  disabled={subiendoFoto}
                  className={`w-full border-2 border-dashed rounded-2xl p-4 flex items-center gap-3 text-sm transition-all disabled:opacity-60
                    ${errores.fotoFrente ? "border-red-400 bg-red-50" : "border-gray-300 bg-gray-50 hover:border-blue-400"}`}
                >
                  {subiendoFoto
                    ? <><Spinner /><span className="text-gray-500">Procesando...</span></>
                    : <><span className="text-2xl">📷</span><span className="text-gray-500">Fotografiar frente del DNI</span></>}
                </button>
              )}
              {errores.fotoFrente && <p className="text-xs text-red-500 mt-1">{errores.fotoFrente}</p>}
            </div>

            <button
              onClick={handleContinuarDatos}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* ── Paso 4: Parentesco ── */}
        {paso === PASO.PARENTESCO && (
          <div className="px-5 py-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">¿Cuál es el parentesco?</h2>
              <div className="mt-3 bg-blue-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <p className="text-base font-bold text-blue-900">{form.socNom}</p>
                  <p className="text-sm text-blue-600">DNI {form.socDocNro}</p>
                </div>
              </div>
            </div>

            {errores.pareDsc && (
              <p className="text-sm text-red-600 font-medium">{errores.pareDsc}</p>
            )}
            {errores.submit && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-700 font-medium">{errores.submit}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {PARENTESCOS.map((p) => (
                <button
                  key={p}
                  onClick={() => set("pareDsc", p)}
                  className={`py-4 px-3 rounded-2xl text-sm font-semibold text-center transition-all border-2
                    ${form.pareDsc === p
                      ? "border-blue-600 bg-blue-600 text-white shadow-md"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 active:bg-gray-50"
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!form.pareDsc}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              ✓ Agregar familiar
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Componentes de soporte ────────────────────────────────────────────────────

function DatoCard({ label, valor }) {
  return (
    <div className="bg-gray-50 rounded-2xl px-4 py-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900">{valor || "—"}</p>
    </div>
  );
}

function CampoEdit({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputClass(err) {
  return `w-full text-base border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
    err ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"
  }`;
}

function Spinner() {
  return <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}

function toInputDate(val) {
  if (!val) return "";
  if (typeof val === "string") {
    const iso = val.includes("T") ? val.slice(0, 10) : val;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  }
  const d = new Date(val);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

function formatFecha(str) {
  if (!str) return "—";
  const parts = str.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
