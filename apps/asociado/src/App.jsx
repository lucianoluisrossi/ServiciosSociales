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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RutaPublica><LoginPage /></RutaPublica>} />
        <Route path="/panel" element={<RutaProtegida><PanelPage /></RutaProtegida>} />
        <Route path="/confirmar-costo" element={<ConfirmarCostoPage />} />
      </Routes>
    </BrowserRouter>
  );
}
