import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyAZGLygr2GJ1ib_ehmlklehnyAquv6g9U0",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "new-iris-f6f26.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "new-iris-f6f26",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "new-iris-f6f26.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "62377083166",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:62377083166:web:6a3e0c70442c1716ec490f",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
// Use initializeFirestore with experimentalForceLongPolling: true to ensure stable connection inside sandbox iframe environments
const customDbId = metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-irisintegratedre-ea8f9c98-a2c7-4b67-bbd1-d65214dcd08c";
const isDefaultDb = !customDbId || customDbId === "(default)";

export const db = isDefaultDb
  ? initializeFirestore(app, { experimentalForceLongPolling: true })
  : initializeFirestore(app, { experimentalForceLongPolling: true }, customDbId);

export default app;
