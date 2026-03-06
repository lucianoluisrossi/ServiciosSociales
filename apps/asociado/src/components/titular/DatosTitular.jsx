export default function DatosTitular({ titular }) {
  if (!titular) return null;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Datos del titular
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Dato label="Razón Social"    value={titular.titNom} />
        <Dato label="N° Documento"    value={titular.socDocNro} />
        <Dato label="Cód. Asociado"   value={titular.cliCod} />
        <Dato label="Cuenta"          value={titular.sumNro} />
        <Dato label="Fecha Nac."      value={formatFecha(titular.cliFecNac)} />
        <Dato label="Fecha Adhesión"  value={formatFecha(titular.sumFacFAd)} />
      </div>
    </div>
  );
}

function Dato({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value ?? "—"}</p>
    </div>
  );
}

function formatFecha(str) {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}