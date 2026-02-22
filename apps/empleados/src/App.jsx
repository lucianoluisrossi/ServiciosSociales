import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthEmpleado } from "./hooks/useAuthEmpleado.js";

function LoginPage() {
  const { login, error, loading } = useAuthEmpleado();
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  return (
    <main className="login-page">
      <div className="login-card">
        <h1 className="login-titulo">CELTA â€” Panel Interno</h1>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <label>ContraseÃ±a</label>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login(email, pass)} />
        <button onClick={() => login(email, pass)} disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </main>
  );
}

function PanelHome() {
  const { user, logout } = useAuthEmpleado();
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Panel CELTA âœ…</h1>
      <p>SesiÃ³n iniciada: {user?.email}</p>
      <button onClick={logout} style={{ width: "auto", marginTop: "1rem" }}>
        Cerrar sesiÃ³n
      </button>
    </div>
  );
}

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
        <Route path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/"
          element={<RutaProtegida><PanelHome /></RutaProtegida>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
