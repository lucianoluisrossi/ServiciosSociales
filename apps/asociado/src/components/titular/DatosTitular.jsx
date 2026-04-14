export default function DatosTitular({ titular }) {
  if (!titular) return null;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Encabezado con nombre */}
      <div className="bg-blue-600 px-4 py-4">
        <p className="text-xs text-blue-200 uppercase tracking-wide font-medium mb-0.5">Titular</p>
        <h2 className="text-lg font-bold text-white leading-tight">{titular.titNom ?? "—"}</h2>
      </div>
      {/* Grilla de datos */}
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        <Dato label="N° Documento"   value={titular.socDocNro} />
        <Dato label="Cód. Asociado"  value={titular.cliCod} />
        <Dato label="Cuenta"         value={titular.sumNro} />
        <Dato label="Fecha Nac."     value={formatFecha(titular.cliFecNac)} />
        <Dato label="Fecha Adhesión" value={formatFecha(titular.sumFacFAd)} fullWidth />
      </div>
    </div>
  );
}

function Dato({ label, value, fullWidth }) {
  return (
    <div className={`bg-white px-4 py-3 ${fullWidth ? "col-span-2" : ""}`}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
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
