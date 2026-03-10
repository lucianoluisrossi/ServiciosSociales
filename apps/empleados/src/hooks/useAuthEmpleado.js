import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export function useAuthEmpleado() {
  const [user, setUser]       = useState(undefined);
  const [rol, setRol]         = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (!u) { setUser(null); setRol(null); return; }
      try {
        const { claims } = await u.getIdTokenResult();
        if (!["empleado", "supervisor"].includes(claims.rol)) {
          await signOut(auth);
          setUser(null); setRol(null);
          setError("No tenés permisos para acceder a este panel.");
          return;
        }
        setUser(u); setRol(claims.rol);
      } catch { setUser(null); setError("Error al verificar permisos."); }
    });
  }, []);

  const login = async (email, password) => {
    setLoading(true); setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch { setError("Email o contraseña incorrectos."); }
    finally { setLoading(false); }
  };

  return { user, rol, error, loading, login, logout: () => signOut(auth) };
}