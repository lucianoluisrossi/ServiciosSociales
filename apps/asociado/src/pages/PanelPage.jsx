import { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import DatosTitular from "../components/titular/DatosTitular";
import ListaAdheridos from "../components/adheridos/ListaAdheridos";
import EstadoSolicitud from "../components/solicitud/EstadoSolicitud";
import ResumenCambios from "../components/solicitud/ResumenCambios";
import { useAdheridos } from "../hooks/useAdheridos";
import { useSolicitud } from "../hooks/useSolicitud";

export default function PanelPage() {
  const auth = getAuth();
  const navigate = useNavigate();
  const { titular, adheridos, loading, error, recargar } = useAdheridos();
  const {
    cambios,
    solicitudActual,
    agregarCambio,
    quitarCambio,
    enviarSolicitud,
    enviando,
  } = useSolicitud();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando sus datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm w-full text-center">
          <p className="text-red-600 font-medium mb-2">Error al cargar datos</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={recargar}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const hayCambiosPendientes = cambios.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">CELTA</h1>
            <p className="text-xs text-gray-500">Servicio de Sepelios</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Estado de solicitud activa */}
        {solicitudActual && (
          <EstadoSolicitud solicitud={solicitudActual} />
        )}

        {/* Datos del titular */}
        {titular && <DatosTitular titular={titular} />}

        {/* Lista de adheridos */}
        <ListaAdheridos
          adheridos={adheridos}
          cambios={cambios}
          onAgregarCambio={agregarCambio}
          onQuitarCambio={quitarCambio}
          solicitudActiva={!!solicitudActual && solicitudActual.estado === "pendiente"}
        />

        {/* Resumen y envío de cambios */}
        {hayCambiosPendientes && (
          <ResumenCambios
            cambios={cambios}
            adheridos={adheridos}
            onQuitarCambio={quitarCambio}
            onEnviar={enviarSolicitud}
            enviando={enviando}
          />
        )}
      </main>
    </div>
  );
}
