/**
 * ScannerDNI
 * Abre la cámara trasera en tiempo real y detecta QR o PDF417.
 */
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ID = "scanner-dni-container";

export default function ScannerDNI({ onDetectado, onError, onCancelar }) {
  const [iniciando, setIniciando] = useState(true);
  const [errorCam, setErrorCam]   = useState(null);
  const scannerRef                = useRef(null);
  const detectadoRef              = useRef(false);

  useEffect(() => {
    let scanner = null;

    const iniciar = async () => {
      try {
        scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 120 },
            aspectRatio: 1.6,
            formatsToSupport: [6, 0], // PDF_417, QR_CODE
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
      if (scannerRef.current) detener(scannerRef.current).catch(() => {});
    };
  }, []);

  const handleCancelar = async () => {
    if (scannerRef.current) await detener(scannerRef.current).catch(() => {});
    onCancelar?.();
  };

  return (
    <div className="space-y-3">
      {/* Visor acotado — html5-qrcode inyecta el video acá */}
      <div className="relative rounded-xl overflow-hidden bg-black mx-auto"
           style={{ width: "100%", maxWidth: 320, height: 200 }}>

        <div id={SCANNER_ID} style={{ width: "100%", height: "100%" }} />

        {/* Override estilos que inyecta html5-qrcode */}
        <style>{`
          #${SCANNER_ID} video {
            width: 100% !important;
            height: 200px !important;
            object-fit: cover !important;
          }
          #${SCANNER_ID} img { display: none !important; }
          #${SCANNER_ID} > div:last-child { display: none !important; }
        `}</style>

        {/* Overlay carga */}
        {iniciando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
            <Spinner />
            <p className="text-white text-xs">Iniciando cámara...</p>
          </div>
        )}

        {/* Overlay error */}
        {errorCam && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-2 p-4">
            <span className="text-2xl">📷</span>
            <p className="text-white text-xs text-center">{errorCam}</p>
          </div>
        )}

        {/* Marco guía */}
        {!iniciando && !errorCam && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-2 border-white/60 rounded-lg relative"
                 style={{ width: 220, height: 110 }}>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 rounded-br" />
              <div className="absolute left-1 right-1 h-0.5 bg-blue-400/80 scanner-line" />
            </div>
          </div>
        )}
      </div>

      {!errorCam && (
        <p className="text-xs text-center text-gray-500">
          Apuntá el código de barras del dorso o el QR del frente al recuadro
        </p>
      )}

      <button onClick={handleCancelar}
        className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
        Cancelar
      </button>
    </div>
  );
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
    <svg className="animate-spin text-white w-7 h-7" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  );
}
