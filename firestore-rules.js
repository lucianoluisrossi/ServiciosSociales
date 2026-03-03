rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Asociado: solo puede leer su propia cuenta
    match /cuentas_asociados/{dni} {
      allow read: if request.auth != null
                  && request.auth.token.rol == "asociado"
                  && request.auth.token.dni == dni;
    }

    // Solicitudes: asociado lee/crea las suyas; empleado lee y actualiza todas
    match /solicitudes/{solicitudId} {
      allow read: if request.auth != null
                  && (
                    (request.auth.token.rol == "asociado"
                     && resource.data.titularDni == request.auth.token.dni)
                    ||
                    request.auth.token.rol in ["empleado", "supervisor"]
                  );

      allow create: if request.auth != null
                    && request.auth.token.rol == "asociado"
                    && request.resource.data.titularDni == request.auth.token.dni
                    && request.resource.data.estado == "pendiente";

      allow update: if request.auth != null
                    && request.auth.token.rol in ["empleado", "supervisor"];
    }

    // Auditoría: solo empleados y supervisores pueden leer
    match /auditoria/{id} {
      allow read: if request.auth != null
                  && request.auth.token.rol in ["empleado", "supervisor"];
    }

  }
}
