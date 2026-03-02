import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../services/firebase";

const iniciarSesionFn = httpsCallable(functions, "iniciarSesionAsociado");
const verificarOTPFn  = httpsCallable(functions, "verificarOTPAsociado");

export function useAuth() {
  const [user, setUser]           = useState(undefined);
  const [paso, setPaso]           = useState("dni");
  const [canalMask, setCanalMask] = useState("");
  const [dniTemp, setDniTemp]     = useState("");
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

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
      setCanalMask(data.canalMask);
      setPaso("otp");
    } catch (e) {
      setError(e.message ?? "Error al verificar el DNI. IntentÃ¡ de nuevo.");
    } finally { setLoading(false); }
  };

  const verificarOTP = async (otp) => {
    setLoading(true); setError(null);
    try {
      const { data } = await verificarOTPFn({ dni: dniTemp, otp });
      await signInWithCustomToken(auth, data.customToken);
    } catch (e) {
      setError(e.message ?? "CÃ³digo incorrecto. VerificÃ¡ e intentÃ¡ de nuevo.");
    } finally { setLoading(false); }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    setPaso("dni"); setDniTemp(""); setCanalMask(""); setError(null);
  };

  return { user, paso, canalMask, error, loading, iniciarSesion, verificarOTP, cerrarSesion };
}
