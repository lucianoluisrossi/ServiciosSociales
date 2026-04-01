# Modificaciones — Vínculos CELTA

## Objetivo
Reemplazar login por email OTP → login por SMS OTP via Twilio.  
Razón: no todos los asociados tienen email registrado.

---

## Flujo de login nuevo

1. Asociado ingresa DNI
2. Si no existe en Firestore → se consulta API de CELTA y se crea la cuenta automáticamente
3. Si no tiene celular registrado → se le pide el celular (paso nuevo en LoginPage)
4. Se envía OTP por SMS (Twilio)
5. Asociado ingresa código → se verifica → se emite Custom Token de Firebase

---

## Archivos modificados

### `functions/package.json`
- Agregado: `twilio ^5.3.0`
- Re-agregado: `resend ^3.2.0` (se usa para notificaciones internas/backoffice, no para login)

### `functions/src/auth/sesionAsociado.js` ⭐ (reescritura completa)
- v3: SMS via Twilio, sin email
- Secrets usados: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `API_CELTA_TOKEN`, `API_CELTA_URL`
- Exporta 3 funciones:
  - `iniciarSesionAsociado`: busca cuenta → si no existe consulta API CELTA y la crea → envía OTP
  - `registrarTelefonoYEnviarOTP`: registra celular nuevo en cuentas sin teléfono y envía OTP
  - `verificarOTPAsociado`: verifica OTP, guarda teléfono pendiente en `canales.telefono`, emite Custom Token

**Fixes críticos aplicados:**
- URL de API CELTA: el secret `API_CELTA_URL` contiene la URL completa con query param (`http://IP:PORT/api/data?cliDocNro=`), el código solo appendea el DNI: `` `${API_CELTA_URL.value()}${dni}` ``
- Header de autenticación API CELTA: usa `X-Api-Key` (no `Authorization: Bearer`)

### `functions/src/auth/activarCuenta.js`
- Reemplazado Resend por Twilio SMS
- `defineSecret` movidos a top level del módulo (fix crítico — Firebase los requiere ahí)
- Parámetro `email` → `telefono`
- `from`: usa `TWILIO_PHONE_NUMBER.value()` (en trial no se puede usar Alphanumeric Sender ID)

### `functions/src/asociado/crearCuenta.js`
- Acepta `telefono` en lugar de `email`
- Guarda en `canales.telefono`

### `functions/src/asociado/registrarEmail.js` ⭐ (nuevo)
- Función callable `registrarEmailAsociado`
- Guarda email en `canales.email` del asociado autenticado
- Necesario porque las reglas de Firestore no permiten que los asociados escriban su propia cuenta

### `functions/src/index.js`
- Exportadas: `registrarTelefonoYEnviarOTP`, `registrarEmailAsociado`

### `apps/asociado/src/hooks/useAuth.js`
- Nuevo estado `paso: "telefono"`
- Nuevo estado `telefonoTemp`
- Nueva función `registrarTelefono(telefono)` → llama `registrarTelefonoYEnviarOTP`
- Nueva función `reenviarOTP()` → llama función correcta según si tiene teléfono o no

### `apps/asociado/src/pages/LoginPage.jsx`
- Nuevo paso "telefono": input con prefijo `+549`
- Paso OTP: ícono 📱 SMS (antes era ✉️ email)
- Botón reenviar usa `reenviarOTP()`

### `apps/asociado/src/hooks/useSolicitud.js`
- Lee `canales.email` y `canales.telefono` de Firestore al iniciar
- Retorna `emailRegistrado` (undefined=cargando, null=sin email, string=tiene email)
- `enviarSolicitud`: llama `registrarEmailFn` si no hay email registrado
- Incluye `telefonoTitular` en el documento de solicitud
- Eliminado parámetro `contacto` (formulario de celular removido)

### `apps/asociado/src/components/solicitud/ResumenCambios.jsx`
- Eliminados campos de celular/teléfono
- Muestra campo email solo si `emailRegistrado === null`
- Botón deshabilitado mientras `emailRegistrado === undefined` (loading)

### `apps/asociado/src/pages/PanelPage.jsx`
- Desestructura `emailRegistrado` de `useSolicitud`
- Lo pasa a `ResumenCambios`
- Signatura de `onEnviar` actualizada

### `apps/empleados/src/components/FormCrearCuenta.jsx`
- Input de teléfono con prefijo `+549` (reemplaza campo email)

### `apps/empleados/src/components/DetalleSolicitud.jsx`
- Muestra `📱 Celular (SMS): telefonoTitular` (teléfono verificado en login)
- Muestra `📞 Celular de contacto: celularContacto` (ingreso manual, null en solicitudes nuevas)

---

## Secrets de Firebase configurados

| Secret | Descripción |
|--------|-------------|
| `TWILIO_ACCOUNT_SID` | Account SID de Twilio |
| `TWILIO_AUTH_TOKEN` | Auth Token de Twilio |
| `TWILIO_PHONE_NUMBER` | Número Twilio (+12602767509, trial) |
| `API_CELTA_TOKEN` | API Key para API CELTA (header: `X-Api-Key`) |
| `API_CELTA_URL` | URL completa con query param: `http://201.159.8.89:8000/api/data?cliDocNro=` |

---

## Pendientes

- [ ] Cuando Twilio pase a producción: cambiar `from` en `activarCuenta.js` y `sesionAsociado.js` a `"CELTA"` (Alphanumeric Sender ID) y eliminar secret `TWILIO_PHONE_NUMBER`
- [ ] Verificar estructura completa que devuelve la API de CELTA para asegurar que todos los campos (`clicod`, etc.) se mapean correctamente
- [ ] Testear flujo completo: DNI sin cuenta → auto-creación → registro celular → OTP → panel
