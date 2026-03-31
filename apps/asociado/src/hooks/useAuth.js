import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../services/firebase";

const iniciarSesionFn         = httpsCallable(functions, "iniciarSesionAsociado");
const registrarTelefonoFn     = httpsCallable(functions, "registrarTelefonoYEnviarOTP");
const verificarOTPFn          = httpsCallable(functions, "verificarOTPAsociado");

export function useAuth() {
  const [user, setUser]               = useState(undefined);
  const [paso, setPaso]               = useState("dni");
  const [canalMask, setCanalMask]     = useState("");
  const [dniTemp, setDniTemp]         = useState("");
  const [telefonoTemp, setTelefonoTemp] = useState("");
  const [error, setError]             = useState(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u ?? null);
      if (u) setPaso("autenticado");
    });
  }, []);

  const iniciarSesion = async (dni) => {
    setLoading(true); setError(null);
    try {
      const { data } = await iniciarSesionFn({ dni });
      setDniTemp(dni);
      if (data.necesitaTelefono) {
        setPaso("telefono");
      } else {
        setCanalMask(data.canalMask);
        setPaso("otp");
      }
    } catch (e) {
      setError(e.message ?? "Error al verificar el DNI. Intentá de nuevo.");
    } finally { setLoading(false); }
  };

  const registrarTelefono = async (telefono) => {
    setLoading(true); setError(null);
    try {
      const { data } = await registrarTelefonoFn({ dni: dniTemp, telefono });
      setTelefonoTemp(telefono);
      setCanalMask(data.canalMask);
      setPaso("otp");
    } catch (e) {
      setError(e.message ?? "Error al registrar el teléfono. Intentá de nuevo.");
    } finally { setLoading(false); }
  };

  const verificarOTP = async (otp) => {
    setLoading(true); setError(null);
    try {
      const { data } = await verificarOTPFn({ dni: dniTemp, otp });
      await signInWithCustomToken(auth, data.customToken);
    } catch (e) {
      setError(e.message ?? "Código incorrecto. Verificá e intentá de nuevo.");
    } finally { setLoading(false); }
  };

  // Reenvía el OTP usando el canal correcto según el paso anterior
  const reenviarOTP = async () => {
    if (telefonoTemp) {
      await registrarTelefono(telefonoTemp);
    } else {
      await iniciarSesion(dniTemp);
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    setPaso("dni");
    setDniTemp(""); setTelefonoTemp(""); setCanalMask(""); setError(null);
  };

  return {
    user, paso, canalMask, error, loading,
    iniciarSesion, registrarTelefono, verificarOTP, reenviarOTP, cerrarSesion,
  };
}
