import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { paso, canalMask, error, loading, iniciarSesion, verificarOTP } = useAuth();
  const [dni, setDni] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);
  const dniValido = /^\d{7,8}$/.test(dni);
  const otpCompleto = otp.join("").length === 6;

  useEffect(() => {
    if (paso === "otp") setCountdown(60);
  }, [paso]);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleOtpChange = (i, val) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerificar = () => {
    if (otpCompleto) verificarOTP(otp.join(""));
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-800 to-blue-950 flex flex-col items-center justify-center px-4 py-10">

      {/* Marca */}
      <div className="mb-8 text-center">
        <div className="w-36 h-36 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <img
            src="/icons/icon-192.png"
            alt="CELTA"
            className="w-28 h-28 object-contain"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">🤝</span>
          <h1 className="text-2xl font-bold text-white tracking-tight">Vínculos CELTA</h1>
        </div>
        <p className="text-blue-300 text-sm mt-1">Actualizá los datos de tus adheridos</p>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-1.5 bg-white rounded-full" />
        <div className={`w-8 h-1.5 rounded-full transition-colors ${paso === "otp" ? "bg-white" : "bg-white/30"}`} />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {paso === "dni" && (
          <div className="p-6 space-y-5 fade-in">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Paso 1 de 2</p>
              <h2 className="text-lg font-bold text-gray-900">Ingresá tu DNI</h2>
            </div>
            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-2">
                Número de documento
              </label>
              <input
                id="dni"
                type="tel"
                inputMode="numeric"
                placeholder="Sin puntos ni espacios"
                value={dni}
                maxLength={8}
                onChange={e => setDni(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && dniValido && iniciarSesion(dni)}
                className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl px-4 py-3.5 text-xl tracking-widest text-center font-mono outline-none transition-colors"
              />
            </div>
            <button
              onClick={() => iniciarSesion(dni)}
              disabled={!dniValido || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl transition-colors text-base"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><Spinner />Verificando...</span>
                : "Continuar →"}
            </button>
          </div>
        )}

        {paso === "otp" && (
          <div className="p-6 space-y-5 fade-in">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Paso 2 de 2</p>
              <h2 className="text-lg font-bold text-gray-900">Verificá tu identidad</h2>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
              <span className="text-xl mt-0.5">✉️</span>
              <div>
                <p className="text-sm text-blue-900 font-medium">Código enviado a</p>
                <p className="text-sm text-blue-700 font-bold">{canalMask}</p>
                <p className="text-xs text-blue-500 mt-0.5">Revisá también tu carpeta de spam</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Código de 6 dígitos
              </label>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className="w-11 h-14 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-center text-xl font-bold font-mono outline-none transition-colors"
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleVerificar}
              disabled={!otpCompleto || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl transition-colors text-base"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><Spinner />Verificando...</span>
                : "Ingresar →"}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button onClick={() => window.location.reload()} className="text-gray-400 hover:text-gray-600">
                ← Cambiar DNI
              </button>
              {countdown > 0
                ? <span className="text-gray-400">Reenviar en {countdown}s</span>
                : <button onClick={() => { iniciarSesion(dni); setCountdown(60); setOtp(["","","","","",""]); }}
                    className="text-blue-600 hover:underline font-medium">
                    Reenviar código
                  </button>
              }
            </div>
          </div>
        )}

        {error && (
          <div className="mx-6 mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 text-center font-medium">{error}</p>
          </div>
        )}
      </div>

      <p className="text-blue-300 text-xs mt-6 text-center">
        ¿No podés ingresar?{" "}
        <a href="tel:+54XXXXXXXX" className="text-white underline font-medium">Llamanos</a>
        {" "}o acercate a nuestras oficinas.
      </p>
    </main>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}