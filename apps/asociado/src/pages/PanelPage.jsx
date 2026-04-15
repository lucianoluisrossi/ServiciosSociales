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
    historialSolicitudes = [],
    tienePendiente,
    agregarCambio,
    quitarCambio,
    enviarSolicitud,
    enviando,
    emailRegistrado,
  } = useSolicitud();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Cargando sus datos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-800 font-semibold mb-1">No se pudieron cargar los datos</p>
          <p className="text-gray-500 text-sm mb-5">{error}</p>
          <button onClick={recargar} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const historialPrevio = historialSolicitudes.filter(
    (s) => s.id !== solicitudActual?.id
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-gradient-to-r from-blue-800 to-indigo-700 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg shadow-inner">🤝</div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Vínculos CELTA</h1>
              <p className="text-xs text-blue-200 leading-tight">
                {titular?.titNom ? `Hola, ${titular.titNom.trim().split(" ")[0]}` : "Servicio de Sepelios"}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-medium">
            Salir
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5 space-y-4 pb-10">
        {solicitudActual && <EstadoSolicitud solicitud={solicitudActual} />}

        <DatosTitular titular={titular} />

        <ListaAdheridos
          adheridos={adheridos}
          cambios={cambios}
          onAgregarCambio={agregarCambio}
          onQuitarCambio={quitarCambio}
          solicitudActiva={tienePendiente}
        />

        {cambios.length > 0 && (
          <ResumenCambios
            cambios={cambios}
            adheridos={adheridos}
            titular={titular}
            onQuitarCambio={quitarCambio}
            onEnviar={(clicod, datosTitular, email) => enviarSolicitud(clicod, datosTitular, email)}
            enviando={enviando}
            tienePendiente={tienePendiente}
            emailRegistrado={emailRegistrado}
          />
        )}

        {historialPrevio.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">
              Historial de solicitudes
            </h3>
            {historialPrevio.map((s) => (
              <EstadoSolicitud key={s.id} solicitud={s} compacto />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
