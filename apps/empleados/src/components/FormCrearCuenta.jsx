import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase";

const crearCuenta = httpsCallable(functions, "crearCuenta");

export default function FormCrearCuenta() {
  const [dni, setDni]           = useState("");
  const [telefono, setTelefono] = useState("");
  const [estado, setEstado]     = useState(null);
  const [mensaje, setMensaje]   = useState("");

  const dniValido      = /^\d{7,8}$/.test(dni);
  const telefonoValido = /^\d{10}$/.test(telefono);

  const handleSubmit = async () => {
    setEstado("enviando");
    setMensaje("");
    try {
      await crearCuenta({ dni, telefono });
      setEstado("ok");
      setMensaje(`Cuenta creada correctamente para DNI ${dni}.`);
      setDni("");
      setTelefono("");
    } catch (e) {
      setEstado("error");
      setMensaje(e.message || "No se pudo crear la cuenta.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Nueva cuenta de asociado</h2>
      <p className="text-sm text-gray-500 mb-5">
        Creá una cuenta para que el asociado pueda ingresar a la app.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="Sin puntos ni espacios"
            value={dni}
            maxLength={8}
            onChange={e => setDni(e.target.value.replace(/\D/g, ""))}
            className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none">
              +549
            </span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="1155551234"
              value={telefono}
              maxLength={10}
              onChange={e => setTelefono(e.target.value.replace(/\D/g, ""))}
              className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg pl-14 pr-3 py-2.5 text-sm outline-none transition-colors"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">10 dígitos sin el 0 ni el 15</p>
        </div>

        {mensaje && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            estado === "ok"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}>
            {mensaje}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!dniValido || !telefonoValido || estado === "enviando"}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {estado === "enviando" ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </div>
    </div>
  );
}
