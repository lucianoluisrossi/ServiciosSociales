import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage         from "./pages/LoginPage.jsx";
import PanelPage         from "./pages/PanelPage.jsx";
import ConfirmarCostoPage from "./pages/ConfirmarCostoPage.jsx";

function RutaProtegida({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<LoginPage />} />
        <Route path="/panel"           element={<RutaProtegida><PanelPage /></RutaProtegida>} />
        {/* Ruta pública: confirmación de costo desde email */}
        <Route path="/confirmar-costo" element={<ConfirmarCostoPage />} />
      </Routes>
    </BrowserRouter>
  );
}
