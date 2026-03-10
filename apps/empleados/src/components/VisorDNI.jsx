import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const getSignedUrl = httpsCallable(functions, "getSignedUrl");

export default function VisorDNI({ dniTitular, dniAdherido, lado = "frente", label = "Ver foto DNI" }) {
  const [url, setUrl] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);

  const cargar = async () => {
    if (url) { setAbierto(true); return; }
    setCargando(true);
    setError(null);
    try {
      const res = await getSignedUrl({ dniTitular, dniAdherido, lado });
      setUrl(res.data.url);
      setAbierto(true);
    } catch {
      setError("No se pudo cargar la foto.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <button
        onClick={cargar}
        disabled={cargando}
        className="text-sm text-blue-700 underline hover:text-blue-900 disabled:text-gray-400"
      >
        {cargando ? "Cargando..." : `Ver ${label}`}
      </button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {abierto && url && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-white rounded-xl p-3 max-w-lg w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-700 text-sm">
                DNI {lado} — {dniAdherido}
              </span>
              <button
                onClick={() => setAbierto(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <img
              src={url}
              alt={`DNI ${lado} de ${dniAdherido}`}
              className="w-full rounded-lg object-contain max-h-96"
            />
          </div>
        </div>
      )}
    </div>
  );
}
