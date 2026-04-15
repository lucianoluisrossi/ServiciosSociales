export default function DatosTitular({ titular }) {
  if (!titular) return null;

  const iniciales = titular.titNom
    ? titular.titNom.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : "?";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Perfil */}
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">{iniciales}</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Titular</p>
          <h2 className="text-base font-bold text-gray-900 leading-tight">{titular.titNom ?? "—"}</h2>
        </div>
      </div>

      {/* Grilla de datos */}
      <div className="border-t border-gray-100 grid grid-cols-2">
        <Dato label="Documento"      value={titular.socDocNro} />
        <Dato label="Cód. Asociado"  value={titular.cliCod}    left />
        <Dato label="Cuenta"         value={titular.sumNro}    top />
        <Dato label="Fecha Nac."     value={formatFecha(titular.cliFecNac)} left top />
        <Dato label="Adherido desde" value={formatFecha(titular.sumFacFAd)} top fullWidth />
      </div>
    </div>
  );
}

function Dato({ label, value, fullWidth, left, top }) {
  return (
    <div className={[
      "px-5 py-3",
      fullWidth ? "col-span-2" : "",
      left ? "border-l border-gray-100" : "",
      top  ? "border-t border-gray-100" : "",
    ].join(" ")}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

function formatFecha(str) {
  if (!str) return "—";
  const iso = typeof str === "string" && str.includes("T") ? str.slice(0, 10) : String(str);
  const parts = iso.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return str;
}
