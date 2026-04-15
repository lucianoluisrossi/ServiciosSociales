import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage.jsx";
import PanelPage from "./pages/PanelPage.jsx";
import ConfirmarCostoPage from "./pages/ConfirmarCostoPage.jsx";

function RutaProtegida({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function RutaPublica({ children }) {
  const { user } = useAuth();
  if (user === undefined) return null;
  if (user) return <Navigate to="/panel" replace />;
  return children;
}

const WA_NUMERO  = "5492983385342";
const WA_MENSAJE = encodeURIComponent("Hola, necesito ayuda con la app de Servicios Sociales CELTA.");

function BotonWhatsApp() {
  return (
    <a
      href={`https://wa.me/${WA_NUMERO}?text=${WA_MENSAJE}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-4 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white pl-4 pr-5 py-3 rounded-full shadow-xl transition-colors"
      aria-label="Contactar por WhatsApp"
    >
      {/* Ícono WhatsApp */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.535 5.856L.057 23.215a.75.75 0 0 0 .916.927l5.487-1.438A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 0 1-4.953-1.355l-.355-.21-3.685.966.984-3.595-.231-.371A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
      </svg>
      <span className="text-sm font-semibold">¿Necesitás ayuda?</span>
    </a>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RutaPublica><LoginPage /></RutaPublica>} />
        <Route path="/panel" element={<RutaProtegida><PanelPage /></RutaProtegida>} />
        <Route path="/confirmar-costo" element={<ConfirmarCostoPage />} />
      </Routes>
      <BotonWhatsApp />
    </BrowserRouter>
  );
}
