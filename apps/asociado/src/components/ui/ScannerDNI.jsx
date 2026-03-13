/**
 * ScannerDNI — pantalla completa
 * Se monta sobre todo el contenido como un modal fullscreen.
 * Esto es la UX estándar para scanners en apps móviles.
 */
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { createPortal } from "react-dom";

const SCANNER_ID = "scanner-dni-container";

export default function ScannerDNI({ onDetectado, onError, onCancelar }) {
  const [iniciando, setIniciando] = useState(true);
  const [errorCam, setErrorCam]   = useState(null);
  const scannerRef                = useRef(null);
  const detectadoRef              = useRef(false);

  useEffect(() => {
    // Bloquear scroll del body mientras el scanner está abierto
    document.body.style.overflow = "hidden";

    const iniciar = async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
          },
          (texto) => {
            if (detectadoRef.current) return;
            detectadoRef.current = true;
            detener(scanner).then(() => onDetectado(texto));
          },
          () => {}
        );

        setIniciando(false);
      } catch (err) {
        console.error("Error iniciando scanner:", err);
        const msg = err?.message?.includes("Permission")
          ? "No se otorgó permiso para usar la cámara."
          : "No se pudo iniciar la cámara. Intentá recargar la página.";
        setErrorCam(msg);
        setIniciando(false);
        onError?.(msg);
      }
    };

    iniciar();

    return () => {
      document.body.style.overflow = "";
      if (scannerRef.current) detener(scannerRef.current).catch(() => {});
    };
  }, []);

  const handleCancelar = async () => {
    if (scannerRef.current) await detener(scannerRef.current).catch(() => {});
    onCancelar?.();
  };

  const contenido = (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <div>
          <p className="text-white text-sm font-semibold">Escaneá el DNI</p>
          <p className="text-white/60 text-xs mt-0.5">
            Código de barras del dorso o QR del frente
          </p>
        </div>
        <button
          onClick={handleCancelar}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <span className="text-white text-lg leading-none">✕</span>
        </button>
      </div>

      {/* Video — ocupa todo el espacio restante */}
      <div className="flex-1 relative overflow-hidden">
        <div id={SCANNER_ID} className="w-full h-full" />

        {/* Overlay carga */}
        {iniciando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-3">
            <Spinner />
            <p className="text-white text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Overlay error */}
        {errorCam && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-3 p-6">
            <span className="text-4xl">📷</span>
            <p className="text-white text-sm text-center">{errorCam}</p>
            <button
              onClick={handleCancelar}
              className="mt-2 px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {!errorCam && (
        <div className="px-4 py-4 bg-black/60 backdrop-blur-sm">
          <button
            onClick={handleCancelar}
            className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );

  // Renderizar fuera del DOM normal para evitar problemas de z-index
  return createPortal(contenido, document.body);
}

async function detener(scanner) {
  try {
    const state = scanner.getState();
    if (state === 2 || state === 3) await scanner.stop();
    scanner.clear();
  } catch {}
}

function Spinner() {
  return (
    <svg className="animate-spin text-white w-10 h-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  );
}
