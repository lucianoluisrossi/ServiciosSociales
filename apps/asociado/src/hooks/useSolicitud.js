import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

export function useSolicitud() {
  const [cambios, setCambios] = useState([]);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

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
    setCambios((prev) => {
      const sinDuplicado = prev.filter(
        (c) => !(c.tipo === cambio.tipo && c.adheridoDni === cambio.adheridoDni)
      );
      return [...sinDuplicado, cambio];
    });
  }, []);

  const quitarCambio = useCallback((index) => {
    setCambios((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const enviarSolicitud = useCallback(async (clicod, datosTitular, contacto) => {
    if (cambios.length === 0) return;
    if (solicitudActual?.estado === "pendiente") {
      throw new Error("Ya tenés una solicitud pendiente de revisión. Esperá a que sea resuelta.");
    }
    setEnviando(true);

    try {
      const user = auth.currentUser;
      const tokenResult = await user.getIdTokenResult();
      const dniAsociado = tokenResult.claims.dni;
      await addDoc(collection(db, "solicitudes"), {
        titularDni: dniAsociado,
        clicod: clicod ?? null,
        titular: {
          titNom: datosTitular?.titNom ?? null,
          sumNro: datosTitular?.sumNro ?? null,
          socDocNro: datosTitular?.socDocNro ?? null,
        },
        celularContacto: {
          codArea: contacto?.codArea ?? null,
          numero: contacto?.celular ?? null,
          // Número completo en formato Argentina para facilitar el uso desde el panel
          completo: contacto ? `+549${contacto.codArea}${contacto.celular}` : null,
        },
        cambios,
        // Flag para el empleado: indica si algún cambio fue ingresado manualmente
        tieneIngresosManual: cambios.some((c) => c.datos?.datosManual === true),
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
  }, [cambios, solicitudActual, auth, db]);

  const tienePendiente = solicitudActual?.estado === "pendiente";

  return { cambios, solicitudActual, tienePendiente, agregarCambio, quitarCambio, enviarSolicitud, enviando };
}
