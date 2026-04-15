import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { paso, canalMask, error, loading, iniciarSesion, registrarTelefono, verificarOTP, reenviarOTP } = useAuth();
  const [dni, setDni]           = useState("");
  const [telefono, setTelefono] = useState("");
  const [otp, setOtp]           = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef([]);

  const dniValido      = /^\d{7,8}$/.test(dni);
  const telefonoValido = /^\d{10}$/.test(telefono.replace(/\D/g, ""));
  const otpCompleto    = otp.join("").length === 6;

  useEffect(() => {
    if (paso === "otp") setCountdown(60);
  }, [paso]);

  // Web OTP API — Android Chrome
  useEffect(() => {
    if (paso !== "otp") return;
    if (!("OTPCredential" in window)) return;
    const ac = new AbortController();
    navigator.credentials.get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((cred) => {
        const digits = cred?.code?.replace(/\D/g, "").slice(0, 6) ?? "";
        if (digits.length === 6) {
          setOtp(digits.split(""));
          otpRefs.current[5]?.focus();
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [paso]);
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleOtpChange = (i, val) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = digits.slice(0, 6).split("");
      while (next.length < 6) next.push("");
      setOtp(next);
      otpRefs.current[Math.min(digits.length - 1, 5)]?.focus();
      return;
    }
    const v = digits.slice(-1);
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

  const handleReenviar = async () => {
    setOtp(["", "", "", "", "", ""]);
    setCountdown(60);
    await reenviarOTP();
  };

  // Indicador de pasos: dni/telefono = paso 1, otp = paso 2
  const pasoIndicador = paso === "otp" ? 2 : 1;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-800 to-blue-950 flex flex-col items-center justify-center px-4 py-10">

      {/* Marca */}
      <div className="mb-8 text-center">
        <div className="w-44 h-44 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
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
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              n < pasoIndicador  ? "bg-blue-400 text-white" :
              n === pasoIndicador ? "bg-white text-blue-700 shadow-md" :
              "bg-white/20 text-white/50"
            }`}>
              {n < pasoIndicador ? "✓" : n}
            </div>
            {n < 2 && <div className={`w-8 h-0.5 rounded-full transition-colors ${pasoIndicador > 1 ? "bg-white" : "bg-white/30"}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">

        {/* ── Paso 1: DNI ── */}
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

        {/* ── Paso 1b: Teléfono (solo si no tiene uno registrado) ── */}
        {paso === "telefono" && (
          <div className="p-6 space-y-5 fade-in">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Paso 1 de 2</p>
              <h2 className="text-lg font-bold text-gray-900">Registrá tu celular</h2>
              <p className="text-sm text-gray-500 mt-1">
                No tenés un celular registrado. Ingresá tu número para recibir el código de acceso.
              </p>
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
                Número de celular
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-base select-none">
                  +549
                </span>
                <input
                  id="telefono"
                  type="tel"
                  inputMode="numeric"
                  placeholder="1155551234"
                  value={telefono}
                  maxLength={10}
                  onChange={e => setTelefono(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => e.key === "Enter" && telefonoValido && registrarTelefono(telefono)}
                  className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-xl pl-16 pr-4 py-3.5 text-xl tracking-widest font-mono outline-none transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                10 dígitos sin el 0 ni el 15 (ej: área + número)
              </p>
            </div>
            <button
              onClick={() => registrarTelefono(telefono)}
              disabled={!telefonoValido || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl transition-colors text-base"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><Spinner />Enviando código...</span>
                : "Enviar código →"}
            </button>
            <button onClick={() => window.location.reload()} className="w-full text-sm text-gray-400 hover:text-gray-600 py-1">
              ← Cambiar DNI
            </button>
          </div>
        )}

        {/* ── Paso 2: OTP ── */}
        {paso === "otp" && (
          <div className="p-6 space-y-5 fade-in">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Paso 2 de 2</p>
              <h2 className="text-lg font-bold text-gray-900">Verificá tu identidad</h2>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
              <span className="text-xl mt-0.5">📱</span>
              <div>
                <p className="text-sm text-blue-900 font-medium">Código enviado por SMS a</p>
                <p className="text-sm text-blue-700 font-bold">{canalMask}</p>
                <p className="text-xs text-blue-500 mt-0.5">Puede demorar unos segundos</p>
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
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    value={d}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold font-mono outline-none transition-all
                      ${d
                        ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                        : "border-gray-200 focus:border-blue-400 text-gray-900"
                      }`}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => otpCompleto && verificarOTP(otp.join(""))}
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
                : <button onClick={handleReenviar} className="text-blue-600 hover:underline font-medium">
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

    </main>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
