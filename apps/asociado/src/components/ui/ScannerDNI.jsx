/**
 * ScannerDNI
 * Abre la cámara trasera en tiempo real y detecta QR o PDF417.
 * Usa html5-qrcode que es mucho más confiable que procesar imágenes estáticas.
 *
 * Props:
 *   onDetectado(texto)  → callback con el texto crudo del código
 *   onError(msg)        → callback si la cámara no se puede abrir
 *   onCancelar()        → callback para cerrar el scanner
 */
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ID = "scanner-dni-container";

export default function ScannerDNI({ onDetectado, onError, onCancelar }) {
  const [iniciando, setIniciando]   = useState(true);
  const [errorCam, setErrorCam]     = useState(null);
  const scannerRef                  = useRef(null);
  const detectadoRef                = useRef(false); // evitar doble callback

  useEffect(() => {
    let scanner = null;

    const iniciar = async () => {
      try {
        scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" }, // cámara trasera
          {
            fps: 10,
            qrbox: { width: 280, height: 180 }, // rectángulo horizontal para DNI
            aspectRatio: 1.6,
            formatsToSupport: [
              // Html5QrcodeSupportedFormats
              6,  // PDF_417
              0,  // QR_CODE
            ],
          },
          (texto) => {
            // Código detectado — evitar múltiples callbacks
            if (detectadoRef.current) return;
            detectadoRef.current = true;
            detener(scanner).then(() => onDetectado(texto));
          },
          () => {
            // Frame sin código — silencioso, es esperado
          }
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
      // Cleanup al desmontar
      if (scannerRef.current) {
        detener(scannerRef.current).catch(() => {});
      }
    };
  }, []);

  const handleCancelar = async () => {
    if (scannerRef.current) {
      await detener(scannerRef.current).catch(() => {});
    }
    onCancelar?.();
  };

  return (
    <div className="space-y-3">
      {/* Visor de cámara */}
      <div className="relative rounded-xl overflow-hidden bg-black">
        {/* Contenedor donde html5-qrcode inyecta el video */}
        <div id={SCANNER_ID} className="w-full" />

        {/* Overlay de carga */}
        {iniciando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
            <Spinner />
            <p className="text-white text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Overlay de error */}
        {errorCam && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-3 p-4">
            <span className="text-3xl">📷</span>
            <p className="text-white text-sm text-center">{errorCam}</p>
          </div>
        )}

        {/* Guía visual superpuesta */}
        {!iniciando && !errorCam && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Marco del área de escaneo */}
            <div className="border-2 border-white/70 rounded-lg w-[280px] h-[180px] relative">
              {/* Esquinas destacadas */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br" />
              {/* Línea de escaneo animada */}
              <div className="absolute left-1 right-1 h-0.5 bg-blue-400/80 scanner-line" />
            </div>
          </div>
        )}
      </div>

      {/* Instrucción */}
      {!errorCam && (
        <p className="text-xs text-center text-gray-500">
          Apuntá el código de barras o QR del DNI al recuadro
        </p>
      )}

      <button
        onClick={handleCancelar}
        className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}

async function detener(scanner) {
  try {
    const state = scanner.getState();
    // Estado 2 = SCANNING, 3 = PAUSED
    if (state === 2 || state === 3) {
      await scanner.stop();
    }
    scanner.clear();
  } catch {
    // Ignorar errores al detener
  }
}

function Spinner() {
  return (
    <svg className="animate-spin text-white w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  );
}
