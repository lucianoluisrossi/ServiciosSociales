const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getStorage } = require("firebase-admin/storage");

exports.getSignedUrl = onCall(
  {
    region: "us-east1",
    cors: [
      "https://celta-sepelios.vercel.app",
      "https://servicios-sociales-empleados.vercel.app", // ← línea agregada
      "http://localhost:5174",
    ],
  },
  async ({ auth: reqAuth, data }) => {
    if (!reqAuth || !["empleado", "supervisor"].includes(reqAuth.token.rol)) {
      throw new HttpsError("permission-denied", "No autorizado");
    }

    const { path } = data;

    // Validar path para evitar path traversal
    if (!path || !path.startsWith("solicitudes/") || path.includes("..")) {
      throw new HttpsError("invalid-argument", "Path inválido");
    }

    const bucket = getStorage().bucket();
    const file = bucket.file(path);

    const [exists] = await file.exists();
    if (!exists) throw new HttpsError("not-found", "Imagen no encontrada");

    const [url] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hora
    });

    return { url };
  }
);
