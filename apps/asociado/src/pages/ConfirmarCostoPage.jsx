import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const responderConfirmacionCosto = httpsCallable(functions, "responderConfirmacionCosto");

export default function ConfirmarCostoPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [estado, setEstado] = useState("esperando"); // esperando | procesando | aprobado | rechazado | error | invalido
  const [clicod, setClicod] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!token) setEstado("invalido");
  }, [token]);

  const responder = async (respuesta) => {
    setEstado("procesando");
    try {
      const result = await responderConfirmacionCosto({ token, respuesta });
      setClicod(result.data.clicod);
      setEstado(respuesta);
    } catch (e) {
      const msg = e.message || "Ocurrió un error inesperado.";
      if (msg.includes("ya fue utilizado") || msg.includes("inválido")) {
        setEstado("invalido");
      } else {
        setErrorMsg(msg);
        setEstado("error");
      }
    }
  };

  if (estado === "invalido") {
    return (
      <Pantalla
        icono="⚠️"
        titulo="Link inválido o ya utilizado"
        texto="Este link de confirmación ya fue usado o no es válido. Si tenés dudas, comunicate con CELTA."
        colorIcono="text-yellow-500"
      />
    );
  }

  if (estado === "procesando") {
    return (
      <Pantalla
        icono={<div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />}
        titulo="Procesando..."
        texto="Por favor esperá un momento."
      />
    );
  }

  if (estado === "aprobado") {
    return (
      <Pantalla
        icono="✅"
        titulo="¡Confirmación registrada!"
        texto={`Aceptaste el costo mensual del servicio${clicod ? ` (cód. cliente: ${clicod})` : ""}. CELTA procesará el alta del servicio.`}
        colorIcono="text-green-500"
        boton={{ label: "Ir al panel", onClick: () => navigate("/panel") }}
      />
    );
  }

  if (estado === "rechazado") {
    return (
      <Pantalla
        icono="❌"
        titulo="Rechazo registrado"
        texto={`Rechazaste el costo mensual del servicio${clicod ? ` (cód. cliente: ${clicod})` : ""}. CELTA será notificada y se comunicará con vos.`}
        colorIcono="text-red-500"
        boton={{ label: "Ir al panel", onClick: () => navigate("/panel") }}
      />
    );
  }

  if (estado === "error") {
    return (
      <Pantalla
        icono="⚠️"
        titulo="Error al procesar"
        texto={errorMsg}
        colorIcono="text-yellow-500"
        boton={{ label: "Reintentar", onClick: () => setEstado("esperando") }}
      />
    );
  }

  // Estado inicial: mostrar los botones de confirmación
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
        {/* Logo / encabezado */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white text-lg">
            🤝
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-800">Vínculos CELTA</h1>
            <p className="text-xs text-gray-500">Servicio de Sepelios</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-800 mb-2">
          Confirmación de costo mensual
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Tu solicitud de alta de familiar fue aprobada. Para completar el proceso,
          necesitamos tu confirmación sobre el costo mensual del servicio.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-xs text-blue-700 font-semibold mb-1">Importante</p>
          <p className="text-sm text-blue-800">
            Al confirmar, aceptás el costo mensual informado por CELTA para
            la cobertura del familiar adherido.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => responder("aprobado")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            ✓ Acepto el costo mensual
          </button>
          <button
            onClick={() => responder("rechazado")}
            className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-300 font-semibold py-3 rounded-xl transition-colors"
          >
            ✕ No acepto el costo
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Este link es de uso único y personal.
        </p>
      </div>
    </div>
  );
}

function Pantalla({ icono, titulo, texto, colorIcono = "", boton }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 text-center">
        <div className={`text-5xl mb-4 ${colorIcono}`}>
          {typeof icono === "string" ? icono : <div className="flex justify-center">{icono}</div>}
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">{titulo}</h2>
        <p className="text-sm text-gray-500 mb-5">{texto}</p>
        {boton && (
          <button
            onClick={boton.onClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            {boton.label}
          </button>
        )}
        <p className="text-xs text-gray-400 mt-3">CELTA Servicios Sociales</p>
      </div>
    </div>
  );
}
