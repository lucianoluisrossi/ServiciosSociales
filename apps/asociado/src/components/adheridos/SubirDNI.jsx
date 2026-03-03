import { useState, useRef } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth";

export default function SubirDNI({ label, dni, lado, onSubido }) {
  const [estado, setEstado] = useState("idle"); // idle | subiendo | ok | error
  const [preview, setPreview] = useState(null);
  const inputRef = useRef();

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview local
    const url = URL.createObjectURL(file);
    setPreview(url);
    setEstado("subiendo");

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const tokenResult = await user.getIdTokenResult();
      const dniAsociado = tokenResult.claims.dni;

      // Ruta: solicitudes/{dniTitular}/{dniAdherido}/{lado}.jpg
      const storage = getStorage();
      const path = `solicitudes/${dniAsociado}/${dni}/${lado}_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file, { contentType: file.type });
      setEstado("ok");
      onSubido(path);
    } catch (err) {
      console.error("Error subiendo foto:", err);
      setEstado("error");
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-lg p-3 flex flex-col items-center gap-1 text-xs transition-colors
          ${estado === "ok" ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-blue-400 bg-gray-50"}
          ${estado === "error" ? "border-red-400 bg-red-50" : ""}
        `}
      >
        {preview && estado !== "subiendo" ? (
          <img src={preview} alt={label} className="h-16 w-full object-cover rounded" />
        ) : (
          <span className="text-2xl">
            {estado === "subiendo" ? "⏳" : estado === "ok" ? "✅" : "📷"}
          </span>
        )}
        <span className="text-gray-500">
          {estado === "subiendo" ? "Subiendo..." :
           estado === "ok" ? "Foto cargada" :
           estado === "error" ? "Error, reintentar" :
           `${label} del DNI`}
        </span>
      </button>
    </div>
  );
}
