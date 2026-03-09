import { useState } from "react";
import { useAuthEmpleado } from "../hooks/useAuthEmpleado";
import ListaSolicitudes from "../components/ListaSolicitudes";
import DetalleSolicitud from "../components/DetalleSolicitud";

export default function PanelPage() {
  const { user, rol, logout } = useAuthEmpleado();
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-blue-800 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          {solicitudSeleccionada && (
            <button
              onClick={() => setSolicitudSeleccionada(null)}
              className="text-blue-200 hover:text-white mr-1"
              aria-label="Volver"
            >
              ← Volver
            </button>
          )}
          <h1 className="text-lg font-bold tracking-wide">CELTA — Panel Interno</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-200 hidden sm:block">{user?.email}</span>
          <span className="bg-blue-700 px-2 py-0.5 rounded text-xs uppercase tracking-wide">
            {rol}
          </span>
          <button
            onClick={logout}
            className="bg-blue-700 hover:bg-blue-600 px-3 py-1 rounded text-sm transition"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {solicitudSeleccionada ? (
          <DetalleSolicitud
            solicitud={solicitudSeleccionada}
            onVolver={() => setSolicitudSeleccionada(null)}
            onResuelta={() => setSolicitudSeleccionada(null)}
          />
        ) : (
          <ListaSolicitudes onSeleccionar={setSolicitudSeleccionada} />
        )}
      </main>
    </div>
  );
}
