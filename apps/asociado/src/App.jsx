import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage  from "./pages/LoginPage.jsx";
import PanelPage  from "./pages/PanelPage.jsx";

function RutaProtegida({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="cargando">Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={<RutaProtegida><PanelPage /></RutaProtegida>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
