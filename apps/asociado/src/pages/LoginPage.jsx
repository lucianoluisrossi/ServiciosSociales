import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { paso, canalMask, error, loading, iniciarSesion, verificarOTP } = useAuth();
  const [dni, setDni] = useState("");
  const [otp, setOtp] = useState("");

  const dniValido = /^\d{7,8}$/.test(dni);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-700 to-blue-900 flex flex-col items-center justify-center px-4 py-10">

      {/* Logo / marca */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">🤝</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Vínculos CELTA</h1>
        <p className="text-blue-200 text-sm mt-1">Actualizá los datos de tus adheridos</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">

        {paso === "dni" && (
          <div className="space-y-5">
            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1.5">
                Número de DNI
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
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => iniciarSesion(dni)}
              disabled={!dniValido || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : "Continuar"}
            </button>
          </div>
        )}

        {paso === "otp" && (
          <div className="space-y-5">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-800">
                Enviamos un código de 6 dígitos a
              </p>
              <p className="font-semibold text-blue-900 mt-0.5">{canalMask}</p>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">
                Código de verificación
              </label>
              <input
                id="otp"
                type="tel"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && otp.length === 6 && verificarOTP(otp)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Revisá tu casilla de correo
              </p>
            </div>

            <button
              onClick={() => verificarOTP(otp)}
              disabled={otp.length !== 6 || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : "Ingresar"}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              ← Volver a ingresar DNI
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-700 text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Ayuda */}
      <p className="text-blue-200 text-xs mt-6 text-center">
        ¿No podés ingresar?{" "}
        <a href="tel:+54XXXXXXXX" className="text-white underline">Llamanos</a>
        {" "}o acercate a nuestras oficinas.
      </p>
    </main>
  );
}
