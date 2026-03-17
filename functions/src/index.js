const { initializeApp } = require("firebase-admin/app");
initializeApp();

const { onCall } = require("firebase-functions/v2/https");

// Función mínima de prueba
exports.testPing = onCall({ region: "us-east1" }, async () => {
  return { ok: true };
});
