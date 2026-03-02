import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { paso, canalMask, error, loading, iniciarSesion, verificarOTP } = useAuth();
  const [dni, setDni] = useState("");
  const [otp, setOtp] = useState("");
  const dniValido = /^\d{7,8}$/.test(dni);

  return (
    <main className="login-page">
      <div className="login-card">
        <h1 className="login-titulo">VÃ­nculos CELTA</h1>
        <p className="login-subtitulo">ActualizÃ¡ los datos de tus adheridos</p>

        {paso === "dni" && (
          <>
            <label htmlFor="dni">NÃºmero de DNI</label>
            <input id="dni" type="number" inputMode="numeric"
              placeholder="Sin puntos" value={dni} maxLength={8}
              onChange={e => setDni(e.target.value)}
              onKeyDown={e => e.key === "Enter" && dniValido && iniciarSesion(dni)}
            />
            <button onClick={() => iniciarSesion(dni)} disabled={!dniValido || loading}>
              {loading ? "Verificando..." : "Continuar"}
            </button>
          </>
        )}

        {paso === "otp" && (
          <>
            <p className="canal-info">
              Enviamos un cÃ³digo de 6 dÃ­gitos a <strong>{canalMask}</strong>
            </p>
            <label htmlFor="otp">CÃ³digo de verificaciÃ³n</label>
            <input id="otp" type="number" inputMode="numeric"
              placeholder="000000" value={otp} maxLength={6}
              onChange={e => setOtp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && otp.length === 6 && verificarOTP(otp)}
            />
            <button onClick={() => verificarOTP(otp)} disabled={otp.length !== 6 || loading}>
              {loading ? "Verificando..." : "Ingresar"}
            </button>
            <button className="btn-secundario" onClick={() => window.location.reload()}>
              Volver a ingresar DNI
            </button>
          </>
        )}

        {error && <p className="error-msg">{error}</p>}

        <p className="login-ayuda">
          Â¿No podÃ©s ingresar?{" "}
          <a href="tel:+54XXXXXXXX">Llamanos al XXXX</a> o acercate a nuestras oficinas.
        </p>
      </div>
    </main>
  );
}
