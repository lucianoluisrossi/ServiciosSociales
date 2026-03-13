/**
 * ScannerDNI — pantalla completa
 * Usa ZXing decodeFromVideoDevice directamente, sin html5-qrcode.
 * Controlamos el <video> nosotros — sin problemas de dimensiones ni CSS.
 */
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { createPortal } from "react-dom";

export default function ScannerDNI({ onDetectado, onError, onCancelar, activo = true }) {
  const [iniciando, setIniciando] = useState(true);
  const [errorCam, setErrorCam]   = useState(null);
  const videoRef     = useRef(null);
  const readerRef    = useRef(null);
  const detectadoRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 100,
    });
    readerRef.current = reader;

    const iniciar = async () => {
      try {
        // Usar decodeFromConstraints — no necesita listar cámaras,
        // le pasamos facingMode directamente
        await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (resultado, error) => {
            if (error) return; // frame sin código — normal
            if (!resultado) return;
            if (detectadoRef.current) return;
            detectadoRef.current = true;
            const texto = resultado.getText();
            // Sacar del contexto de ZXing antes de notificar a React
            // Evita que el re-render interrumpa el stream
            setTimeout(() => onDetectado(texto), 0);
          }
        );

        setIniciando(false);
      } catch (err) {
        console.error("Error scanner:", err);
        // DEBUG: mostrar error detallado en pantalla
        const msg = `${err?.name || "Error"}: ${err?.message || "sin mensaje"}`;
        setErrorCam(msg);
        setIniciando(false);
        onError?.(msg);
      }
    };

    iniciar();

    return () => {
      document.body.style.overflow = "";
      // No llamamos reset() acá — lo hace handleCancelar cuando corresponde
    };
  }, []);

  const handleCancelar = () => {
    try { readerRef.current?.reset(); } catch {}
    onCancelar?.();
  };

  const contenido = (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#000", display: activo ? "flex" : "none", flexDirection: "column",
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

      {/* Video — ocupa todo el espacio disponible */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <video
          ref={videoRef}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          muted
          playsInline
        />

        {/* Overlay carga */}
        {iniciando && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#000", gap: 12,
          }}>
            <Spinner />
            <p style={{ color: "#fff", fontSize: 13 }}>Iniciando cámara...</p>
          </div>
        )}

        {/* Overlay error */}
        {errorCam && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "#000", gap: 12, padding: 24,
          }}>
            <span style={{ fontSize: 36 }}>📷</span>
            <p style={{ color: "#fff", fontSize: 13, textAlign: "center" }}>{errorCam}</p>
          </div>
        )}

        {/* Marco guía — solo decorativo, la detección ocurre en todo el frame */}
        {!iniciando && !errorCam && (
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 280, height: 160,
              border: "2px solid rgba(255,255,255,0.5)",
              borderRadius: 8, position: "relative",
            }}>
              {/* Esquinas */}
              {[
                { top: -2, left: -2, borderTop: "4px solid #60a5fa", borderLeft: "4px solid #60a5fa", borderRadius: "6px 0 0 0" },
                { top: -2, right: -2, borderTop: "4px solid #60a5fa", borderRight: "4px solid #60a5fa", borderRadius: "0 6px 0 0" },
                { bottom: -2, left: -2, borderBottom: "4px solid #60a5fa", borderLeft: "4px solid #60a5fa", borderRadius: "0 0 0 6px" },
                { bottom: -2, right: -2, borderBottom: "4px solid #60a5fa", borderRight: "4px solid #60a5fa", borderRadius: "0 0 6px 0" },
              ].map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 20, height: 20, ...s }} />
              ))}
              {/* Línea animada */}
              <div style={{
                position: "absolute", left: 4, right: 4, height: 2,
                background: "rgba(96,165,250,0.8)",
                animation: "scanLine 2s ease-in-out infinite",
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {!errorCam && (
        <div style={{
          flexShrink: 0, padding: "12px 16px",
          background: "rgba(0,0,0,0.75)",
        }}>
          <button onClick={handleCancelar} style={{
            width: "100%", padding: "12px 0", borderRadius: 12,
            background: "rgba(255,255,255,0.12)", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}>
            Cancelar
          </button>
        </div>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 4px; }
          50%  { top: calc(100% - 4px); }
          100% { top: 4px; }
        }
      `}</style>
    </div>
  );

  return createPortal(contenido, document.body);
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
