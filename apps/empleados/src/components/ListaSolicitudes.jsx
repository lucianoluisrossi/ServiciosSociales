import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

const FILTROS = ["todos", "pendiente", "aprobado", "rechazado"];
const BADGE = {
  pendiente: "bg-yellow-100 text-yellow-800",
  aprobado:  "bg-green-100 text-green-800",
  rechazado: "bg-red-100 text-red-800",
};

function formatFecha(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ListaSolicitudes({ onSeleccionar }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando]       = useState(true);
  const [filtro, setFiltro]           = useState("pendiente");

  useEffect(() => {
    const q = query(collection(db, "solicitudes"), orderBy("creadoEn", "desc"));
    const unsub = onSnapshot(q, snap => {
      setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });
    return unsub;
  }, []);

  const visibles = filtro === "todos"
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtro);

  const conteo = estado => solicitudes.filter(s => s.estado === estado).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Solicitudes</h2>
        <span className="text-sm text-gray-500">
          {visibles.length} resultado{visibles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTROS.map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
              filtro === f
                ? "bg-blue-800 text-white border-blue-800"
                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
            }`}
          >
            {f === "todos"
              ? `Todas (${solicitudes.length})`
              : `${f.charAt(0).toUpperCase() + f.slice(1)} (${conteo(f)})`}
          </button>
        ))}
      </div>

      {cargando && (
        <p className="text-center text-gray-500 py-10">Cargando solicitudes...</p>
      )}

      {!cargando && visibles.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          No hay solicitudes {filtro !== "todos" ? `en estado "${filtro}"` : ""}.
        </div>
      )}

      <ul className="space-y-3">
        {visibles.map(s => (
          <li key={s.id}>
            <button
              onClick={() => onSeleccionar(s)}
              className="w-full bg-white rounded-xl shadow-sm px-5 py-4 text-left hover:shadow-md hover:border-blue-300 border border-transparent transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {s.titular?.titNom ?? `DNI ${s.titularDni}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
                    <span>DNI {s.titular?.socDocNro ?? s.titularDni}</span>
                    <span>Cód. {s.clicod}</span>
                    {s.titular?.sumNro && <span>N° afil. {s.titular.sumNro}</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{formatFecha(s.creadoEn)}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {s.cambios?.length ?? 0} cambio{s.cambios?.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BADGE[s.estado] ?? "bg-gray-100 text-gray-600"}`}>
                  {s.estado}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}