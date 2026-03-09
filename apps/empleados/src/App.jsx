import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthEmpleado } from "./hooks/useAuthEmpleado";
import LoginPage from "./pages/LoginPage";
import PanelPage from "./pages/PanelPage";

function RutaProtegida({ children }) {
  const { user } = useAuthEmpleado();
  if (user === undefined) return <div className="cargando">Cargando...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuthEmpleado();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<RutaProtegida><PanelPage /></RutaProtegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
