import { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export function useAdheridos() {
  const [titular, setTitular] = useState(null);
  const [adheridos, setAdheridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTitular(null);
    setAdheridos([]);
    try {
      const functions = getFunctions(undefined, "us-east1");
      const obtener = httpsCallable(functions, "obtenerDatosAsociado");
      const result = await obtener();
      console.log("Respuesta Cloud Function:", result.data);
      const { titular, adheridos } = result.data;
      setTitular(titular);
      setAdheridos(adheridos ?? []);
    } catch (e) {
      console.error("Error en useAdheridos:", e);
      setError(e.message || "No se pudo obtener la información.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { titular, adheridos, loading, error, recargar: cargar };
}
