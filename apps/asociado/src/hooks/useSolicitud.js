import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Reemplaza recursivamente todos los valores `undefined` por `null`
 * para que Firestore no rechace el documento.
 */
function sanitizar(obj) {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizar);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, sanitizar(v)])
  );
}

export function useSolicitud(titular) {
  const [cambios, setCambios] = useState([]);
  const [cambiosTitular, setCambiosTitular] = useState(null);
  const [solicitudActual, setSolicitudActual] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const auth = getAuth();
  const db = getFirestore();

  // Escucha la solicitud activa en tiempo real
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
          if (data.estado === "pendiente" || ahora - creadoEn < horas48) {
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

  // --- Cambios en adheridos ---

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

  // --- Cambios en titular ---

  const actualizarDatosTitular = useCallback((nuevosDatos) => {
    setCambiosTitular(nuevosDatos);
  }, []);

  // --- Envío ---

  const enviarSolicitud = useCallback(
    async (clicod, datosTitular) => {
      const hayAlgo = cambios.length > 0 || cambiosTitular !== null;
      if (!hayAlgo) return;

      setEnviando(true);
      try {
        const user = auth.currentUser;
        const tokenResult = await user.getIdTokenResult();
        const dniAsociado = tokenResult.claims.dni;

        const payload = sanitizar({
          titularDni: dniAsociado,
          clicod: clicod ?? null,
          titular: {
            titNom: datosTitular?.titNom ?? null,
            sumNro: datosTitular?.sumNro ?? null,
            socDocNro: datosTitular?.socDocNro ?? null,
          },
          cambios,
          ...(cambiosTitular
            ? {
                cambiosTitular: {
                  ...cambiosTitular,
                  original: {
                    celular: titular?.celular ?? null,
                    facturaElectronica: titular?.facturaElectronica ?? false,
                  },
                },
              }
            : {}),
          estado: "pendiente",
          creadoEn: serverTimestamp(),
          revisadoPor: null,
          motivoRechazo: null,
        });

        await addDoc(collection(db, "solicitudes"), payload);

        setCambios([]);
        setCambiosTitular(null);
      } catch (e) {
        throw e;
      } finally {
        setEnviando(false);
      }
    },
    [cambios, cambiosTitular, titular, auth, db]
  );

  return {
    cambios,
    cambiosTitular,
    solicitudActual,
    enviando,
    agregarCambio,
    quitarCambio,
    actualizarDatosTitular,
    enviarSolicitud,
  };
}
