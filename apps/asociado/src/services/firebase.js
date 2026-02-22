import { initializeApp }           from "firebase/app";
import { getAuth,
         connectAuthEmulator }      from "firebase/auth";
import { getFirestore,
         connectFirestoreEmulator } from "firebase/firestore";
import { getStorage,
         connectStorageEmulator }   from "firebase/storage";
import { getFunctions,
         connectFunctionsEmulator } from "firebase/functions";

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
});

export const auth      = getAuth(app);
export const db        = getFirestore(app);
export const storage   = getStorage(app);
export const functions = getFunctions(app, "us-east1");

if (import.meta.env.VITE_ENV === "development") {
  connectAuthEmulator(auth,           "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db,        "localhost", 8080);
  connectStorageEmulator(storage,     "localhost", 9199);
  connectFunctionsEmulator(functions, "localhost", 5001);
}
