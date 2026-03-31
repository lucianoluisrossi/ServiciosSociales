const { initializeApp } = require("firebase-admin/app");
initializeApp();

const { iniciarSesionAsociado, registrarTelefonoYEnviarOTP, verificarOTPAsociado } = require("./auth/sesionAsociado");
const { activarCuenta, confirmarActivacion, buscarAsociadoParaActivar } = require("./auth/activarCuenta");
const { obtenerDatosAsociado } = require("./asociado/obtenerDatos");
const { crearCuenta } = require("./asociado/crearCuenta");
const { registrarEmailAsociado } = require("./asociado/registrarEmail");
const { resolverSolicitud } = require("./solicitudes/resolverSolicitud");
const { notificarNuevaSolicitud } = require("./solicitudes/notificarNuevaSolicitud");
const { responderConfirmacionCosto } = require("./solicitudes/responderConfirmacionCosto");
const { getSignedUrl } = require("./storage/getSignedUrl");
const { validarFotoDNI } = require("./storage/validarFotoDNI");

exports.iniciarSesionAsociado = iniciarSesionAsociado;
exports.registrarTelefonoYEnviarOTP = registrarTelefonoYEnviarOTP;
exports.verificarOTPAsociado = verificarOTPAsociado;
exports.activarCuenta = activarCuenta;
exports.confirmarActivacion = confirmarActivacion;
exports.buscarAsociadoParaActivar = buscarAsociadoParaActivar;
exports.obtenerDatosAsociado = obtenerDatosAsociado;
exports.crearCuenta = crearCuenta;
exports.registrarEmailAsociado = registrarEmailAsociado;
exports.resolverSolicitud = resolverSolicitud;
exports.notificarNuevaSolicitud = notificarNuevaSolicitud;
exports.responderConfirmacionCosto = responderConfirmacionCosto;
exports.getSignedUrl = getSignedUrl;
exports.validarFotoDNI = validarFotoDNI;