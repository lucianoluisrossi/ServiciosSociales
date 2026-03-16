const { initializeApp } = require("firebase-admin/app");
initializeApp();

const { iniciarSesionAsociado, verificarOTPAsociado } =
  require("./auth/sesionAsociado");
const { activarCuenta, confirmarActivacion, buscarAsociadoParaActivar } =
  require("./auth/activarCuenta");
const { obtenerDatosAsociado } = require("./asociado/obtenerDatos");
const { crearCuenta } = require("./asociado/crearCuenta");
const { resolverSolicitud } = require("./solicitudes/resolverSolicitud");
const { notificarNuevaSolicitud } = require("./solicitudes/notificarNuevaSolicitud");
const { responderConfirmacionCosto } = require("./solicitudes/responderConfirmacionCosto");
const { getSignedUrl } = require("./storage/getSignedUrl");
const { validarFotoDNI } = require("./storage/validarFotoDNI");

exports.iniciarSesionAsociado = iniciarSesionAsociado.iniciarSesionAsociado;
exports.verificarOTPAsociado = verificarOTPAsociado.verificarOTPAsociado;
exports.activarCuenta = activarCuenta.activarCuenta;
exports.confirmarActivacion = confirmarActivacion.confirmarActivacion;
exports.buscarAsociadoParaActivar = buscarAsociadoParaActivar.buscarAsociadoParaActivar;
exports.obtenerDatosAsociado = obtenerDatosAsociado.obtenerDatosAsociado;
exports.crearCuenta = crearCuenta.crearCuenta;
exports.resolverSolicitud = resolverSolicitud.resolverSolicitud;
exports.notificarNuevaSolicitud = notificarNuevaSolicitud.notificarNuevaSolicitud;
exports.responderConfirmacionCosto = responderConfirmacionCosto.responderConfirmacionCosto;
exports.getSignedUrl = getSignedUrl.getSignedUrl;
exports.validarFotoDNI = validarFotoDNI.validarFotoDNI;
