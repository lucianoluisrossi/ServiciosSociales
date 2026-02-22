# VÃ­nculos CELTA
## Sistema de actualizaciÃ³n de adheridos al servicio de sepelios

PWA para que los asociados de CELTA consulten y actualicen los datos
de sus familiares adheridos al servicio de sepelios, con flujo de
revisiÃ³n y aprobaciÃ³n por parte del equipo interno.

## Stack
- React 18 + Vite
- Firebase (Auth, Firestore, Storage, Cloud Functions)
- Deploy: Vercel (frontend) + Firebase CLI (backend)

## Inicio rÃ¡pido

```bash
npm install
cp apps/asociado/.env.example  apps/asociado/.env
cp apps/empleados/.env.example apps/empleados/.env

# 3 terminales:
npm run dev:emulators   # Firebase local
npm run dev:asociado    # localhost:5173
npm run dev:empleados   # localhost:5174
```

## Deploy
Ver documentaciÃ³n en /docs o README completo.
