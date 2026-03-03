export default function DatosTitular({ titular }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Datos del titular
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <Dato label="Apellido" value={titular.cliape} />
        <Dato label="Cód. cliente" value={titular.clicod} />
        <Dato label="N° servicio" value={titular.sumnro} />
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
