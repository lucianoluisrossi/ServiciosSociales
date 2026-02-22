# ─────────────────────────────────────────────────────────────────
# setup-celta-pwa.ps1
# Crea la estructura completa del proyecto Vínculos CELTA
# Ejecutar desde la carpeta donde querés crear el proyecto:
#   powershell -ExecutionPolicy Bypass -File setup-celta-pwa.ps1
# ─────────────────────────────────────────────────────────────────

$root = "celta-pwa"

function New-Dir($path) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
}
function New-File($path, $content) {
    New-Dir (Split-Path $path)
    Set-Content -Path $path -Value $content -Encoding UTF8
}

Write-Host "Creando estructura de $root..." -ForegroundColor Cyan

# ── Carpetas base ─────────────────────────────────────────────────
New-Dir "$root/apps/asociado/src/services"
New-Dir "$root/apps/asociado/src/hooks"
New-Dir "$root/apps/asociado/src/pages"
New-Dir "$root/apps/asociado/src/components/auth"
New-Dir "$root/apps/asociado/src/components/titular"
New-Dir "$root/apps/asociado/src/components/adheridos"
New-Dir "$root/apps/asociado/src/components/solicitud"
New-Dir "$root/apps/asociado/public/icons"
New-Dir "$root/apps/empleados/src/services"
New-Dir "$root/apps/empleados/src/hooks"
New-Dir "$root/apps/empleados/src/pages"
New-Dir "$root/apps/empleados/src/components/auth"
New-Dir "$root/apps/empleados/src/components/solicitudes"
New-Dir "$root/apps/empleados/src/components/activacion"
New-Dir "$root/apps/empleados/public"
New-Dir "$root/functions/src/auth"
New-Dir "$root/functions/src/asociado"
New-Dir "$root/functions/src/solicitudes"
New-Dir "$root/functions/src/storage"
New-Dir "$root/scripts"

# ═════════════════════════════════════════════════════════════════
# RAÍZ
# ═════════════════════════════════════════════════════════════════

New-File "$root/.gitignore" @'
# Dependencias
node_modules/

# Builds
apps/asociado/dist/
apps/empleados/dist/
functions/lib/

# Variables de entorno — NUNCA commitear valores reales
.env
.env.local
.env.production
.env.*.local

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Credenciales Admin SDK — NUNCA commitear
serviceAccount.json
*-adminsdk-*.json

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
'@

New-File "$root/.firebaserc" @'
{
  "projects": {
    "default": "celta-pwa"
  }
}
'@

New-File "$root/firebase.json" @'
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", "lib", ".git", "*.test.js"]
    }
  ],
  "emulators": {
    "auth":      { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage":   { "port": 9199 },
    "ui":        { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
'@

New-File "$root/firestore.rules" @'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function esAsociado() {
      return request.auth != null && request.auth.token.rol == "asociado";
    }
    function esEmpleado() {
      return request.auth != null
        && request.auth.token.rol in ["empleado", "supervisor"];
    }
    function esSupervisor() {
      return request.auth != null && request.auth.token.rol == "supervisor";
    }
    function esPropietario(dni) {
      return esAsociado() && request.auth.token.dni == dni;
    }

    match /cuentas_asociados/{dni} {
      allow read:  if esPropietario(dni) || esEmpleado();
      allow write: if false;
    }

    match /solicitudes/{solicitudId} {
      allow create: if esAsociado()
        && request.resource.data.titularDni == request.auth.token.dni
        && request.resource.data.estado == "pendiente"
        && request.resource.data.revisadoPor == null;
      allow read: if (esAsociado()
          && resource.data.titularDni == request.auth.token.dni)
        || esEmpleado();
      allow update, delete: if false;
    }

    match /auditoria/{auditId} {
      allow read:  if esEmpleado();
      allow write: if false;
    }

    match /usuarios_internos/{uid} {
      allow read:  if request.auth.uid == uid || esSupervisor();
      allow write: if esSupervisor();
    }

    match /_otp_temp/{docId} {
      allow read, write: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
'@

New-File "$root/firestore.indexes.json" @'
{
  "indexes": [
    {
      "collectionGroup": "solicitudes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "estado",    "order": "ASCENDING"  },
        { "fieldPath": "creadoEn",  "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "solicitudes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "titularDni", "order": "ASCENDING"  },
        { "fieldPath": "creadoEn",   "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "auditoria",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "solicitudId", "order": "ASCENDING"  },
        { "fieldPath": "timestamp",   "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
'@

New-File "$root/storage.rules" @'
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /dni/{solicitudId}/{adheridoId}/{archivo} {
      allow write: if request.auth != null
        && request.auth.token.rol == "asociado"
        && archivo.matches('(frente|dorso)\\.jpg')
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
      allow read: if false;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
'@

New-File "$root/package.json" @'
{
  "name": "celta-pwa",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/asociado", "apps/empleados", "functions"],
  "scripts": {
    "dev:asociado":     "npm -w apps/asociado run dev",
    "dev:empleados":    "npm -w apps/empleados run dev",
    "dev:emulators":    "firebase emulators:start",
    "build:asociado":   "npm -w apps/asociado run build",
    "build:empleados":  "npm -w apps/empleados run build",
    "deploy:rules":     "firebase deploy --only firestore:rules,firestore:indexes,storage",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:firebase":  "npm run deploy:rules && npm run deploy:functions"
  },
  "devDependencies": {
    "firebase-tools": "^13.0.0"
  }
}
'@

New-File "$root/README.md" @'
# Vínculos CELTA
## Sistema de actualización de adheridos al servicio de sepelios

PWA para que los asociados de CELTA consulten y actualicen los datos
de sus familiares adheridos al servicio de sepelios, con flujo de
revisión y aprobación por parte del equipo interno.

## Stack
- React 18 + Vite
- Firebase (Auth, Firestore, Storage, Cloud Functions)
- Deploy: Vercel (frontend) + Firebase CLI (backend)

## Inicio rápido

```bash
npm install
cp apps/asociado/.env.example  apps/asociado/.env
cp apps/empleados/.env.example apps/empleados/.env

# 3 terminales:
npm run dev:emulators   # Firebase local
npm run dev:asociado    # localhost:5173
npm run dev:empleados   # localhost:5174
```

## Deploy
Ver documentación en /docs o README completo.
'@

# ═════════════════════════════════════════════════════════════════
# APP ASOCIADO
# ═════════════════════════════════════════════════════════════════

New-File "$root/apps/asociado/package.json" @'
{
  "name": "celta-asociado",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.3.0",
    "vite-plugin-pwa": "^0.20.0"
  }
}
'@

New-File "$root/apps/asociado/vite.config.js" @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo-celta.png"],
      manifest: {
        name: "Vinculos CELTA",
        short_name: "Vinculos",
        description: "Actualizá los datos de tus adheridos al servicio de sepelios de CELTA",
        theme_color: "#1e40af",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      }
    })
  ]
});
'@

New-File "$root/apps/asociado/vercel.json" @'
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",        "value": "DENY" },
        { "key": "X-XSS-Protection",       "value": "1; mode=block" },
        { "key": "Referrer-Policy",        "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",     "value": "camera=(self), microphone=()" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
'@

New-File "$root/apps/asociado/.env.example" @'
VITE_FB_API_KEY=AIzaSy...
VITE_FB_AUTH_DOMAIN=celta-pwa.firebaseapp.com
VITE_FB_PROJECT_ID=celta-pwa
VITE_FB_STORAGE_BUCKET=celta-pwa.appspot.com
VITE_FB_MESSAGING_SENDER_ID=123456789
VITE_FB_APP_ID=1:123456789:web:abc123
VITE_ENV=development
'@

New-File "$root/apps/asociado/index.html" @'
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Actualizá los datos de tus adheridos al servicio de sepelios de CELTA" />
    <meta name="theme-color" content="#1e40af" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <link rel="icon" type="image/png" href="/favicon.ico" />
    <title>Vinculos CELTA</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@

New-File "$root/apps/asociado/src/main.jsx" @'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
'@

New-File "$root/apps/asociado/src/App.jsx" @'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage     from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

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
        <Route path="/login"
          element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route path="/"
          element={<RutaProtegida><DashboardPage /></RutaProtegida>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
'@

New-File "$root/apps/asociado/src/services/firebase.js" @'
import { initializeApp }           from "firebase/app";
import { getAuth,
         connectAuthEmulator }      from "firebase/auth";
import { getFirestore,
         connectFirestoreEmulator } from "firebase/firestore";
import { getStorage,
         connectStorageEmulator }   from "firebase/storage";
import { getFunctions,
         connectFunctionsEmulator } from "firebase/functions";

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
});

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const functions = getFunctions(app, "us-east1");

if (import.meta.env.VITE_ENV === "development") {
  connectAuthEmulator(auth,           "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db,        "localhost", 8080);
  connectStorageEmulator(storage,     "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
'@

New-File "$root/apps/asociado/src/hooks/useAuth.js" @'
import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../services/firebase";

const iniciarSesionFn = httpsCallable(functions, "iniciarSesionAsociado");
const verificarOTPFn  = httpsCallable(functions, "verificarOTPAsociado");

export function useAuth() {
  const [user, setUser]           = useState(undefined);
  const [paso, setPaso]           = useState("dni");
  const [canalMask, setCanalMask] = useState("");
  const [dniTemp, setDniTemp]     = useState("");
  const [error, setError]         = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u ?? null);
      if (u) setPaso("autenticado");
    });
  }, []);

  const iniciarSesion = async (dni) => {
    setLoading(true); setError(null);
    try {
      const { data } = await iniciarSesionFn({ dni });
      setDniTemp(dni);
      setCanalMask(data.canalMask);
      setPaso("otp");
    } catch (e) {
      setError(e.message ?? "Error al verificar el DNI. Intentá de nuevo.");
    } finally { setLoading(false); }
  };

  const verificarOTP = async (otp) => {
    setLoading(true); setError(null);
    try {
      const { data } = await verificarOTPFn({ dni: dniTemp, otp });
      await signInWithCustomToken(auth, data.customToken);
    } catch (e) {
      setError(e.message ?? "Código incorrecto. Verificá e intentá de nuevo.");
    } finally { setLoading(false); }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    setPaso("dni"); setDniTemp(""); setCanalMask(""); setError(null);
  };

  return { user, paso, canalMask, error, loading, iniciarSesion, verificarOTP, cerrarSesion };
}
'@

New-File "$root/apps/asociado/src/pages/LoginPage.jsx" @'
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const { paso, canalMask, error, loading, iniciarSesion, verificarOTP } = useAuth();
  const [dni, setDni] = useState("");
  const [otp, setOtp] = useState("");
  const dniValido = /^\d{7,8}$/.test(dni);

  return (
    <main className="login-page">
      <div className="login-card">
        <h1 className="login-titulo">Vínculos CELTA</h1>
        <p className="login-subtitulo">Actualizá los datos de tus adheridos</p>

        {paso === "dni" && (
          <>
            <label htmlFor="dni">Número de DNI</label>
            <input id="dni" type="number" inputMode="numeric"
              placeholder="Sin puntos" value={dni} maxLength={8}
              onChange={e => setDni(e.target.value)}
              onKeyDown={e => e.key === "Enter" && dniValido && iniciarSesion(dni)}
            />
            <button onClick={() => iniciarSesion(dni)} disabled={!dniValido || loading}>
              {loading ? "Verificando..." : "Continuar"}
            </button>
          </>
        )}

        {paso === "otp" && (
          <>
            <p className="canal-info">
              Enviamos un código de 6 dígitos a <strong>{canalMask}</strong>
            </p>
            <label htmlFor="otp">Código de verificación</label>
            <input id="otp" type="number" inputMode="numeric"
              placeholder="000000" value={otp} maxLength={6}
              onChange={e => setOtp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && otp.length === 6 && verificarOTP(otp)}
            />
            <button onClick={() => verificarOTP(otp)} disabled={otp.length !== 6 || loading}>
              {loading ? "Verificando..." : "Ingresar"}
            </button>
            <button className="btn-secundario" onClick={() => window.location.reload()}>
              Volver a ingresar DNI
            </button>
          </>
        )}

        {error && <p className="error-msg">{error}</p>}

        <p className="login-ayuda">
          ¿No podés ingresar?{" "}
          <a href="tel:+54XXXXXXXX">Llamanos al XXXX</a> o acercate a nuestras oficinas.
        </p>
      </div>
    </main>
  );
}
'@

New-File "$root/apps/asociado/src/pages/DashboardPage.jsx" @'
// TODO: implementar DashboardPage
// Ver documentación en los artefactos de la conversación
export default function DashboardPage() {
  return (
    <div className="dashboard">
      <header><h1>Mi Cobertura</h1></header>
      <p>Panel del asociado — en construcción.</p>
    </div>
  );
}
'@

New-File "$root/apps/asociado/src/index.css" @'
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --azul: #1e40af; --azul-claro: #3b82f6; --azul-bg: #eff6ff;
  --rojo: #dc2626; --verde: #16a34a;
  --gris-text: #374151; --gris-borde: #d1d5db; --gris-bg: #f9fafb;
  --blanco: #ffffff; --radio: 8px; --sombra: 0 2px 12px rgba(0,0,0,.08);
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--gris-bg); color: var(--gris-text); min-height: 100dvh;
}
.login-page {
  display: flex; justify-content: center; align-items: center;
  min-height: 100dvh; padding: 1rem;
}
.login-card {
  background: var(--blanco); border-radius: var(--radio);
  box-shadow: var(--sombra); padding: 2rem 1.5rem;
  width: 100%; max-width: 400px;
  display: flex; flex-direction: column; gap: 1rem;
}
.login-titulo { font-size: 1.5rem; font-weight: 700; color: var(--azul); text-align: center; }
.login-subtitulo { font-size: .9rem; color: #6b7280; text-align: center; }
.canal-info { font-size: .9rem; background: var(--azul-bg); border-radius: var(--radio); padding: .75rem 1rem; color: var(--azul); }
.login-ayuda { font-size: .8rem; color: #6b7280; text-align: center; }
.login-ayuda a { color: var(--azul-claro); }
label { font-size: .85rem; font-weight: 600; color: var(--gris-text); }
input, select, textarea {
  width: 100%; padding: .65rem .9rem;
  border: 1.5px solid var(--gris-borde); border-radius: var(--radio);
  font-size: max(16px, 1rem); color: var(--gris-text); background: var(--blanco);
  transition: border-color .15s;
}
input:focus, select:focus, textarea:focus {
  outline: none; border-color: var(--azul-claro);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
input[type=number] { -moz-appearance: textfield; }
button {
  display: inline-flex; align-items: center; justify-content: center;
  gap: .4rem; padding: .7rem 1.2rem; border: none; border-radius: var(--radio);
  font-size: .95rem; font-weight: 600; cursor: pointer;
  transition: opacity .15s; width: 100%; background: var(--azul); color: var(--blanco);
}
button:disabled { opacity: .5; cursor: not-allowed; }
.btn-secundario { background: var(--gris-bg); color: var(--gris-text); border: 1.5px solid var(--gris-borde); }
.error-msg {
  font-size: .85rem; color: var(--rojo); background: #fef2f2;
  border: 1px solid #fecaca; border-radius: var(--radio); padding: .6rem .9rem;
}
.cargando { display: flex; justify-content: center; align-items: center; min-height: 100dvh; color: #6b7280; }
.dashboard { max-width: 600px; margin: 0 auto; padding: 1rem; display: flex; flex-direction: column; gap: 1.25rem; }
.dashboard header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0 .5rem; }
.dashboard header h1 { font-size: 1.1rem; font-weight: 700; color: var(--azul); }
'@

# ═════════════════════════════════════════════════════════════════
# APP EMPLEADOS
# ═════════════════════════════════════════════════════════════════

New-File "$root/apps/empleados/package.json" @'
{
  "name": "celta-empleados",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":     "vite --port 5174",
    "build":   "vite build",
    "preview": "vite preview --port 5174"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.3.0"
  }
}
'@

New-File "$root/apps/empleados/vite.config.js" @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
'@

New-File "$root/apps/empleados/vercel.json" @'
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",        "value": "DENY" },
        { "key": "X-XSS-Protection",       "value": "1; mode=block" },
        { "key": "Referrer-Policy",        "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",     "value": "camera=()" }
      ]
    }
  ]
}
'@

New-File "$root/apps/empleados/.env.example" @'
VITE_FB_API_KEY=AIzaSy...
VITE_FB_AUTH_DOMAIN=celta-pwa.firebaseapp.com
VITE_FB_PROJECT_ID=celta-pwa
VITE_FB_STORAGE_BUCKET=celta-pwa.appspot.com
VITE_FB_MESSAGING_SENDER_ID=123456789
VITE_FB_APP_ID=1:123456789:web:abc123
VITE_ENV=development
'@

New-File "$root/apps/empleados/index.html" @'
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <link rel="icon" type="image/png" href="/favicon.ico" />
    <title>CELTA — Panel Interno</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
'@

New-File "$root/apps/empleados/src/main.jsx" @'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);
'@

New-File "$root/apps/empleados/src/App.jsx" @'
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
        <h1 className="login-titulo">CELTA — Panel Interno</h1>
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <label>Contraseña</label>
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
      <h1>Panel CELTA ✅</h1>
      <p>Sesión iniciada: {user?.email}</p>
      <button onClick={logout} style={{ width: "auto", marginTop: "1rem" }}>
        Cerrar sesión
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
'@

New-File "$root/apps/empleados/src/services/firebase.js" @'
import { initializeApp }           from "firebase/app";
import { getAuth,
         connectAuthEmulator }      from "firebase/auth";
import { getFirestore,
         connectFirestoreEmulator } from "firebase/firestore";
import { getStorage,
         connectStorageEmulator }   from "firebase/storage";
import { getFunctions,
         connectFunctionsEmulator } from "firebase/functions";

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
});

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const functions = getFunctions(app, "us-east1");

if (import.meta.env.VITE_ENV === "development") {
  connectAuthEmulator(auth,           "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db,        "localhost", 8080);
  connectStorageEmulator(storage,     "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
'@

New-File "$root/apps/empleados/src/hooks/useAuthEmpleado.js" @'
import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export function useAuthEmpleado() {
  const [user, setUser]     = useState(undefined);
  const [rol, setRol]       = useState(null);
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (!u) { setUser(null); setRol(null); return; }
      try {
        const { claims } = await u.getIdTokenResult();
        if (!["empleado", "supervisor"].includes(claims.rol)) {
          await signOut(auth);
          setUser(null); setRol(null);
          setError("No tenés permisos para acceder a este panel.");
          return;
        }
        setUser(u); setRol(claims.rol);
      } catch { setUser(null); setError("Error al verificar permisos."); }
    });
  }, []);

  const login = async (email, password) => {
    setLoading(true); setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch { setError("Email o contraseña incorrectos."); }
    finally { setLoading(false); }
  };

  return { user, rol, error, loading, login, logout: () => signOut(auth) };
}
'@

New-File "$root/apps/empleados/src/index.css" @'
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --azul: #1e40af; --azul-claro: #3b82f6; --azul-bg: #eff6ff;
  --rojo: #dc2626; --verde: #16a34a;
  --gris-text: #374151; --gris-borde: #d1d5db; --gris-bg: #f3f4f6;
  --blanco: #ffffff; --radio: 8px; --sombra: 0 2px 12px rgba(0,0,0,.08);
  --nav-h: 56px;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--gris-bg); color: var(--gris-text); min-height: 100dvh;
}
.login-page {
  display: flex; justify-content: center; align-items: center;
  min-height: 100dvh; background: var(--azul);
}
.login-card {
  background: var(--blanco); border-radius: var(--radio);
  box-shadow: var(--sombra); padding: 2.5rem 2rem;
  width: 100%; max-width: 380px;
  display: flex; flex-direction: column; gap: 1rem;
}
.login-titulo { font-size: 1.25rem; font-weight: 700; color: var(--azul); }
label { font-size: .85rem; font-weight: 600; }
input, select, textarea {
  width: 100%; padding: .6rem .85rem;
  border: 1.5px solid var(--gris-borde); border-radius: var(--radio);
  font-size: .95rem; background: var(--blanco); transition: border-color .15s;
}
input:focus, select:focus, textarea:focus {
  outline: none; border-color: var(--azul-claro);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}
button {
  display: inline-flex; align-items: center; justify-content: center;
  padding: .65rem 1rem; border: none; border-radius: var(--radio);
  font-size: .9rem; font-weight: 600; cursor: pointer;
  transition: opacity .15s; width: 100%; background: var(--azul); color: var(--blanco);
}
button:disabled { opacity: .5; cursor: not-allowed; }
.error-msg {
  font-size: .85rem; color: var(--rojo); background: #fef2f2;
  border: 1px solid #fecaca; border-radius: var(--radio); padding: .5rem .75rem;
}
.cargando { display: flex; justify-content: center; align-items: center; min-height: 100dvh; color: #6b7280; }
'@

# ═════════════════════════════════════════════════════════════════
# CLOUD FUNCTIONS
# ═════════════════════════════════════════════════════════════════

New-File "$root/functions/package.json" @'
{
  "name": "celta-functions",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": "20" },
  "main": "src/index.js",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "lint":  "eslint ."
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "resend": "^3.2.0"
  },
  "devDependencies": {
    "eslint": "^8.15.0",
    "eslint-config-google": "^0.14.0"
  }
}
'@

New-File "$root/functions/.env.example" @'
API_CELTA_URL=https://api.interna.celta.com.ar
API_CELTA_TOKEN=
RESEND_API_KEY=re_...
WA_PHONE_ID=
WA_TOKEN=
EMAIL_BACKOFFICE=backoffice@celta.com.ar
PANEL_URL=https://panel.celta.com.ar
'@

New-File "$root/functions/src/index.js" @'
const { initializeApp } = require("firebase-admin/app");
initializeApp();

const { iniciarSesionAsociado, verificarOTPAsociado } =
  require("./auth/sesionAsociado");
const { activarCuenta, confirmarActivacion, buscarAsociadoParaActivar } =
  require("./auth/activarCuenta");
const { obtenerDatosAsociado } =
  require("./asociado/obtenerDatos");
const { resolverSolicitud } =
  require("./solicitudes/resolverSolicitud");
const { notificarNuevaSolicitud } =
  require("./solicitudes/notificarNuevaSolicitud");
const { getSignedUrl } =
  require("./storage/getSignedUrl");

module.exports = {
  iniciarSesionAsociado,
  verificarOTPAsociado,
  activarCuenta,
  confirmarActivacion,
  buscarAsociadoParaActivar,
  obtenerDatosAsociado,
  resolverSolicitud,
  notificarNuevaSolicitud,
  getSignedUrl,
};
'@

# Placeholders para las Cloud Functions (implementación en la conversación)
$fnPlaceholder = @'
// TODO: ver implementacion completa en los artefactos de la conversacion
const { onCall } = require("firebase-functions/v2/https");
exports.placeholder = onCall(() => ({ ok: true }));
'@

New-File "$root/functions/src/auth/sesionAsociado.js"           $fnPlaceholder
New-File "$root/functions/src/auth/activarCuenta.js"            $fnPlaceholder
New-File "$root/functions/src/asociado/obtenerDatos.js"         $fnPlaceholder
New-File "$root/functions/src/solicitudes/resolverSolicitud.js" $fnPlaceholder
New-File "$root/functions/src/solicitudes/notificarNuevaSolicitud.js" $fnPlaceholder
New-File "$root/functions/src/storage/getSignedUrl.js"          $fnPlaceholder

# ═════════════════════════════════════════════════════════════════
# SCRIPTS DE ADMINISTRACIÓN
# ═════════════════════════════════════════════════════════════════

New-File "$root/scripts/asignarRolEmpleado.js" @'
/**
 * Asigna el custom claim de rol a un empleado de CELTA.
 * Ejecutar: node scripts/asignarRolEmpleado.js
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 */
const admin = require("firebase-admin");
admin.initializeApp();

async function asignarRol(email, rol) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { rol });
  await admin.firestore().collection("usuarios_internos").doc(user.uid).set({
    email, rol, activo: true,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Rol "${rol}" asignado a ${email}`);
}

// Modificar con los emails reales antes de ejecutar
asignarRol("empleado@celta.com.ar",  "empleado");
asignarRol("supervisor@celta.com.ar", "supervisor");
'@

# ═════════════════════════════════════════════════════════════════
# FINALIZAR
# ═════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "Estructura creada exitosamente en ./$root" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "  1. cd $root"
Write-Host "  2. Editar .firebaserc con tu Firebase Project ID"
Write-Host "  3. cp apps\asociado\.env.example  apps\asociado\.env"
Write-Host "  4. cp apps\empleados\.env.example apps\empleados\.env"
Write-Host "  5. Completar los valores en ambos .env"
Write-Host "  6. npm install"
Write-Host "  7. npm run dev:emulators  (terminal 1)"
Write-Host "  8. npm run dev:asociado   (terminal 2)"
Write-Host "  9. npm run dev:empleados  (terminal 3)"
Write-Host ""
Write-Host "Implementar las Cloud Functions desde los artefactos de la conversacion." -ForegroundColor Cyan
