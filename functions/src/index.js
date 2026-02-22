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
