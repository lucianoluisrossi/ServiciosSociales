import { useEffect, useState } from "react";

/**
 * Toast — notificación flotante no bloqueante.
 *
 * Props:
 *   mensaje  string   Texto a mostrar
 *   tipo     "error" | "advertencia" | "exito" | "info"
 *   onClose  fn       Callback al cerrarse
 *   duracion number   Ms antes de auto-cerrar (0 = manual)
 */
export default function Toast({ mensaje, tipo = "error", onClose, duracion = 5000 }) {
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    // Entrada con pequeño delay para disparar la animación CSS
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!duracion) return;
    const t = setTimeout(cerrar, duracion);
    return () => clearTimeout(t);
  }, [duracion]);

  const cerrar = () => {
    setSaliendo(true);
    setTimeout(() => onClose?.(), 300);
  };

  const estilos = {
    error:       { bg: "bg-red-600",    icono: "✕",  label: "Error" },
    advertencia: { bg: "bg-amber-500",  icono: "⚠",  label: "Atención" },
    exito:       { bg: "bg-green-600",  icono: "✓",  label: "Listo" },
    info:        { bg: "bg-blue-600",   icono: "ℹ",  label: "Info" },
  };

  const { bg, icono } = estilos[tipo] ?? estilos.error;

  return (
    <div
      className={`
        fixed bottom-6 left-1/2 z-50
        transition-all duration-300 ease-out
        ${visible && !saliendo
          ? "opacity-100 translate-y-0 -translate-x-1/2"
          : "opacity-0 translate-y-4 -translate-x-1/2"
        }
      `}
      style={{ maxWidth: "calc(100vw - 2rem)", minWidth: "260px" }}
    >
      <div className={`${bg} text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3`}>
        {/* Ícono */}
        <span className="text-lg leading-none mt-0.5 shrink-0 font-bold">{icono}</span>

        {/* Mensaje */}
        <p className="text-sm leading-snug flex-1">{mensaje}</p>

        {/* Cerrar */}
        <button
          onClick={cerrar}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity text-lg leading-none ml-1"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/**
 * Hook para manejar toasts de forma imperativa.
 * Uso:
 *   const { toast, ToastContainer } = useToast();
 *   toast("Mensaje", "error");
 *
 *   return <div>...<ToastContainer /></div>
 */
export function useToast() {
  const [items, setItems] = useState([]);

  const toast = (mensaje, tipo = "error", duracion = 5000) => {
    const id = Date.now();
    setItems(prev => [...prev, { id, mensaje, tipo, duracion }]);
  };

  const remove = (id) => setItems(prev => prev.filter(t => t.id !== id));

  const ToastContainer = () => (
    <>
      {items.map((t, i) => (
        <div
          key={t.id}
          style={{ bottom: `${1.5 + i * 4.5}rem` }}
          className="fixed left-1/2 -translate-x-1/2 z-50 w-full px-4"
          // Sobreescribimos el `bottom` del Toast individual para apilarlos
        >
          <Toast
            mensaje={t.mensaje}
            tipo={t.tipo}
            duracion={t.duracion}
            onClose={() => remove(t.id)}
          />
        </div>
      ))}
    </>
  );

  return { toast, ToastContainer };
}
