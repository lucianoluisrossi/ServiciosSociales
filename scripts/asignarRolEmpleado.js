/**
 * Asigna el custom claim de rol a un empleado de CELTA.
 * Ejecutar: node scripts/asignarRolEmpleado.js
 * Requiere: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json
 */
const admin = require("firebase-admin");
admin.initializeApp();

async function asignarRol(email, rol) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { rol });
  await admin.firestore().collection("usuarios_internos").doc(user.uid).set({
    email, rol, activo: true,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Rol "${rol}" asignado a ${email}`);
}

// Modificar con los emails reales antes de ejecutar
asignarRol("empleado@celta.com.ar",  "empleado");
asignarRol("supervisor@celta.com.ar", "supervisor");
