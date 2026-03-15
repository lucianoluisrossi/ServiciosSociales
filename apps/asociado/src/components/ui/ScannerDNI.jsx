/**
 * ScannerDNI
 * Scanner fullscreen con html5-qrcode.
 * Se monta/desmonta limpiamente — sin portal, sin display:none.
 */
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ID = "scanner-dni-container";

export default function ScannerDNI({ onDetectado, onError, onCancelar }) {
  const [iniciando, setIniciando] = useState(true);
  const [errorCam, setErrorCam]   = useState(null);
  const scannerRef                = useRef(null);
  const detectadoRef              = useRef(false);
  const onDetectadoRef            = useRef(onDetectado);

  // Mantener ref actualizada sin re-ejecutar el effect
  useEffect(() => { onDetectadoRef.current = onDetectado; }, [onDetectado]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const iniciar = async () => {
      try {
        const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (texto) => {
            if (detectadoRef.current) return;
            detectadoRef.current = true;
            // Usar ref para evitar closure stale
            const cb = onDetectadoRef.current;
            setTimeout(() => cb(texto), 0);
          },
          () => {}
        );

        setIniciando(false);
      } catch (err) {
        console.error("Error scanner:", err);
        const msg = err?.message?.includes("Permission") || err?.name === "NotAllowedError"
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

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "12px 16px",
        background: "rgba(0,0,0,0.75)",
      }}>
        <div>
          <p style={{ color: "#fff", fontSize: 14, fontWeight: 600, margin: 0 }}>
            Escaneá el DNI
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, margin: "2px 0 0" }}>
            Código de barras del dorso o QR del frente
          </p>
        </div>
        <button onClick={handleCancelar} style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "rgba(255,255,255,0.15)", border: "none",
          color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      {/* Video */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div id={SCANNER_ID} style={{ width: "100%" }} />

        {iniciando && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center",
            justifyContent: "center", background: "#000", gap: 12,
          }}>
            <Spinner />
            <p style={{ color: "#fff", fontSize: 13 }}>Iniciando cámara...</p>
          </div>
        )}

        {errorCam && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center",
            justifyContent: "center", background: "#000", gap: 12, padding: 24,
          }}>
            <span style={{ fontSize: 36 }}>📷</span>
            <p style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>{errorCam}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {!errorCam && (
        <div style={{ flexShrink: 0, padding: "12px 16px", background: "rgba(0,0,0,0.75)" }}>
          <button onClick={handleCancelar} style={{
            width: "100%", padding: "12px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.12)", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}>
            Cancelar
          </button>
        </div>
      )}
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
    <svg style={{ width: 40, height: 40, animation: "spin 1s linear infinite" }}
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
      <path style={{ opacity: 0.75 }} fill="white"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
  );
}
