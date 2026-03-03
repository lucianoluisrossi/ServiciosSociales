import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

export function useSolicitud() {
  const [cambios, setCambios] = useState([]);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // Escuchar solicitud pendiente del asociado en tiempo real
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const dni = user.reloadUserInfo?.customAttributes
      ? JSON.parse(user.reloadUserInfo.customAttributes).dni
      : null;

    // Obtener el DNI de los claims
    user.getIdTokenResult().then((tokenResult) => {
      const dniAsociado = tokenResult.claims.dni;
      if (!dniAsociado) return;

      const q = query(
        collection(db, "solicitudes"),
        where("titularDni", "==", dniAsociado),
        where("estado", "in", ["pendiente", "aprobada", "rechazada"]),
        orderBy("creadoEn", "desc"),
        limit(1)
      );

      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = { id: doc.id, ...doc.data() };
          // Solo mostrar si es reciente (últimas 48h) o está pendiente
          const ahora = Date.now();
          const creadoEn = data.creadoEn?.toMillis?.() ?? 0;
          const horas48 = 48 * 60 * 60 * 1000;
          if (data.estado === "pendiente" || (ahora - creadoEn < horas48)) {
            setSolicitudActual(data);
          } else {
            setSolicitudActual(null);
          }
        } else {
          setSolicitudActual(null);
        }
      });

      return () => unsub();
    });
  }, [auth.currentUser]);

  const agregarCambio = useCallback((cambio) => {
    // cambio: { tipo: "editar"|"eliminar"|"agregar", adheridoDni, datos }
    setCambios((prev) => {
      // Reemplazar si ya existe un cambio para el mismo adherido
      const sinDuplicado = prev.filter(
        (c) => !(c.tipo === cambio.tipo && c.adheridoDni === cambio.adheridoDni)
      );
      return [...sinDuplicado, cambio];
    });
  }, []);

  const quitarCambio = useCallback((index) => {
    setCambios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const enviarSolicitud = useCallback(async (clicod) => {
    if (cambios.length === 0) return;
    setEnviando(true);
    try {
      const user = auth.currentUser;
      const tokenResult = await user.getIdTokenResult();
      const dniAsociado = tokenResult.claims.dni;

      await addDoc(collection(db, "solicitudes"), {
        titularDni: dniAsociado,
        clicod: clicod ?? null,
        cambios,
        estado: "pendiente",
        creadoEn: serverTimestamp(),
        revisadoPor: null,
        motivoRechazo: null,
      });

      setCambios([]);
    } catch (e) {
      throw e;
    } finally {
      setEnviando(false);
    }
  }, [cambios, auth, db]);

  return { cambios, solicitudActual, agregarCambio, quitarCambio, enviarSolicitud, enviando };
}
