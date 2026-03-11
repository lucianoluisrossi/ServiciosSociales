import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { useValidarFotoDNI } from "../../hooks/useValidarFotoDNI";
import { useToast } from "../ui/Toast";

/**
 * SubirDNI
 * Props:
 *   label    string   "Frente" | "Dorso"
 *   dni      string   DNI del adherido
 *   lado     string   "frente" | "dorso"
 *   onSubido fn(path) Callback con el path de Storage cuando la foto es válida y subida
 */
export default function SubirDNI({ label, dni, lado, onSubido }) {
  const [estado, setEstado] = useState("idle"); // idle | validando | subiendo | ok | error
  const [preview, setPreview] = useState(null);
  const inputRef = useRef();

  const { validar } = useValidarFotoDNI();
  const { toast, ToastContainer } = useToast();

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input para permitir re-selección del mismo archivo
    e.target.value = "";

    // Preview optimista
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setEstado("validando");

    // ── Paso 1 + 2: heurísticas + IA ──────────────────────────────────────
    let resultado;
    try {
      resultado = await validar(file, lado);
    } catch (err) {
      // IA no disponible → bloqueamos (política del proyecto)
      console.error("Validador no disponible:", err);
      setEstado("error");
      setPreview(null);
      toast(
        "No se pudo verificar la foto porque el servicio de validación no está disponible. Revisá tu conexión e intentá nuevamente.",
        "advertencia"
      );
      return;
    }

    if (!resultado.ok) {
      setEstado("error");
      setPreview(null);
      toast(resultado.mensaje, "error");
      return;
    }

    // ── Paso 3: subir a Storage ────────────────────────────────────────────
    setEstado("subiendo");
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const tokenResult = await user.getIdTokenResult();
      const dniAsociado = tokenResult.claims.dni;

      const storage = getStorage();
      const path = `solicitudes/${dniAsociado}/${dni}/${lado}_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file, { contentType: file.type });
      setEstado("ok");
      onSubido(path);
    } catch (err) {
      console.error("Error subiendo foto:", err);
      setEstado("error");
      toast("No se pudo subir la foto. Verificá tu conexión e intentá de nuevo.", "error");
    }
  };

  const puedeReintentar = estado === "error" || estado === "ok";

  return (
    <>
      <ToastContainer />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={estado === "validando" || estado === "subiendo"}
        className={`
          w-full border-2 border-dashed rounded-xl p-3
          flex flex-col items-center gap-1.5 text-xs
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          ${estado === "ok"
            ? "border-green-400 bg-green-50 hover:bg-green-100"
            : estado === "error"
            ? "border-red-300 bg-red-50 hover:bg-red-100"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
          }
        `}
      >
        {/* Preview o ícono de estado */}
        {preview && estado === "ok" ? (
          <img
            src={preview}
            alt={label}
            className="h-16 w-full object-cover rounded-lg"
          />
        ) : (
          <span className="text-2xl">
            {(estado === "validando" || estado === "subiendo") && <Spinner />}
            {estado === "ok"    && "✅"}
            {estado === "error" && "📷"}
            {estado === "idle"  && "📷"}
          </span>
        )}

        {/* Texto de estado */}
        <span className={`font-medium ${
          estado === "ok"    ? "text-green-700" :
          estado === "error" ? "text-red-600"   :
          "text-gray-500"
        }`}>
          {estado === "validando" && "Verificando foto..."}
          {estado === "subiendo"  && "Subiendo..."}
          {estado === "ok"        && "Foto cargada ✓"}
          {estado === "error"     && `Reintentar ${label}`}
          {estado === "idle"      && `${label} del DNI`}
        </span>

        {/* Sub-texto según estado */}
        {(estado === "validando" || estado === "subiendo") && (
          <span className="text-gray-400 text-xs">
            {estado === "validando" ? "Comprobando documento..." : "Guardando imagen..."}
          </span>
        )}
        {puedeReintentar && estado !== "ok" && (
          <span className="text-gray-400 text-xs">Tocá para elegir otra foto</span>
        )}
      </button>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin text-blue-500 w-6 h-6"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  );
}
