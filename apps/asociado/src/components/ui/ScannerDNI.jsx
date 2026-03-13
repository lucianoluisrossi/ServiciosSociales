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
            // qrbox más pequeño que el contenedor — deja margen para el algoritmo
            qrbox: { width: 250, height: 150 },
            // Sin aspectRatio forzado — dejar que la cámara use el suyo natural
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
      {/* 
        Contenedor: dejamos que html5-qrcode maneje su propio tamaño de video,
        pero limitamos la altura máxima del wrapper para que no sea enorme.
        El video se muestra con object-fit: cover para recortar el exceso.
      */}
      <div className="relative rounded-xl overflow-hidden bg-black"
           style={{ maxHeight: 280 }}>

        <div id={SCANNER_ID} className="w-full" />

        {/* Recortar altura excedente que inyecta html5-qrcode */}
        <style>{`
          #${SCANNER_ID} { overflow: hidden; max-height: 280px; }
          #${SCANNER_ID} video { max-height: 280px; width: 100% !important; object-fit: cover; }
          #${SCANNER_ID} img { display: none !important; }
        `}</style>

        {/* Overlay carga */}
        {iniciando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2"
               style={{ minHeight: 200 }}>
            <Spinner />
            <p className="text-white text-xs">Iniciando cámara...</p>
          </div>
        )}

        {/* Overlay error */}
        {errorCam && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-2 p-4"
               style={{ minHeight: 200 }}>
            <span className="text-2xl">📷</span>
            <p className="text-white text-xs text-center">{errorCam}</p>
          </div>
        )}
      </div>

      {!errorCam && (
        <p className="text-xs text-center text-gray-500">
          Apuntá el código de barras del dorso o el QR del frente al recuadro azul
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
