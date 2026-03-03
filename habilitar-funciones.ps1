$funciones = @(
  "iniciarSesionAsociado",
  "verificarOTPAsociado",
  "activarCuenta",
  "confirmarActivacion",
  "buscarAsociadoParaActivar",
  "obtenerDatosAsociado",
  "resolverSolicitud",
  "notificarNuevaSolicitud",
  "getSignedUrl"
)

foreach ($fn in $funciones) {
  gcloud functions add-invoker-policy-binding $fn `
    --region=us-east1 `
    --member="allUsers"
  Write-Host "✅ $fn habilitada" -ForegroundColor Green
}