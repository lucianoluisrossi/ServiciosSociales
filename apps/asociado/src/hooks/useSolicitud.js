// hooks/useSolicitud.js
import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Maneja el estado de la solicitud activa del asociado.
 * Incluye:
 *  - cambios en adheridos (agregar / editar / eliminar)
 *  - cambios en datos del titular (celular, facturaElectronica)
 */
export function useSolicitud(titular) {
  const [cambios, setCambios] = useState([]);
  const [cambiosTitular, setCambiosTitular] = useState(null); // { celular, facturaElectronica }
  const [solicitudActiva, setSolicitudActiva] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const auth = getAuth();
  const dni = auth.currentUser?.claims?.dni ?? auth.currentUser?.uid;

  // Escucha la solicitud activa en tiempo real
  useEffect(() => {
    if (!dni) return;

    const q = query(
      collection(db, "solicitudes"),
      where("titularDni", "==", dni),
      where("estado", "in", ["pendiente", "aprobada", "rechazada"]),
      orderBy("creadoEn", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const doc = snap.docs[0];
        setSolicitudActiva({ id: doc.id, ...doc.data() });
      } else {
        setSolicitudActiva(null);
      }
    });

    return () => unsub();
  }, [dni]);

  // --- Cambios en adheridos ---

  function agregarCambio(tipo, datos) {
    setCambios((prev) => {
      // Si ya existe un cambio para este adherido, reemplazarlo
      const sinDuplicado = prev.filter(
        (c) => !(c.tipo === tipo && c.datos?.socDocNro === datos?.socDocNro)
      );
      return [...sinDuplicado, { tipo, datos, timestamp: Date.now() }];
    });
  }

  function quitarCambio(tipo, socDocNro) {
    setCambios((prev) =>
      prev.filter(
        (c) => !(c.tipo === tipo && c.datos?.socDocNro === socDocNro)
      )
    );
  }

  // --- Cambios en titular ---

  /**
   * Llamado desde DatosTitular cuando el titular guarda sus cambios.
   * @param {Object} nuevosDatos - { celular, facturaElectronica }
   */
  function actualizarDatosTitular(nuevosDatos) {
    setCambiosTitular(nuevosDatos);
  }

  // --- Envío de solicitud ---

  const hayAlgoCambio =
    cambios.length > 0 || cambiosTitular !== null;

  async function enviarSolicitud() {
    if (!hayAlgoCambio || !titular) return;
    setEnviando(true);
    setError(null);

    try {
      const solicitudData = {
        estado: "pendiente",
        titularDni: dni,
        clicod: titular.cliCod,
        titular: {
          titNom: titular.titNom,
          sumNro: titular.sumNro,
          socDocNro: titular.socDocNro,
        },
        cambios,
        ...(cambiosTitular
          ? {
              cambiosTitular: {
                ...cambiosTitular,
                // Guardamos también los valores originales para que el empleado
                // pueda comparar en el panel
                original: {
                  celular: titular.celular ?? null,
                  facturaElectronica: titular.facturaElectronica ?? false,
                },
              },
            }
          : {}),
        creadoEn: serverTimestamp(),
        revisadoPor: null,
        motivoRechazo: null,
      };

      // Guardar datos del titular en cuentas_asociados (sin los cambios aún)
      await setDoc(
        doc(db, "cuentas_asociados", dni),
        {
          ultimoAcceso: serverTimestamp(),
          // Si hay cambios en titular, los marcamos como pendientes
          ...(cambiosTitular
            ? { cambiosTitularPendientes: cambiosTitular }
            : {}),
        },
        { merge: true }
      );

      await addDoc(collection(db, "solicitudes"), solicitudData);

      // Limpiar estado local tras envío exitoso
      setCambios([]);
      setCambiosTitular(null);
    } catch (err) {
      console.error("Error al enviar solicitud:", err);
      setError("No se pudo enviar la solicitud. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return {
    cambios,
    cambiosTitular,
    solicitudActiva,
    enviando,
    error,
    hayAlgoCambio,
    agregarCambio,
    quitarCambio,
    actualizarDatosTitular,
    enviarSolicitud,
  };
}
