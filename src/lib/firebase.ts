import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { firebaseConfig as localFirebaseConfig } from "./firebase-config";

let app;
let firebaseConfig;

// Firebase App Hosting provides the config as a stringified JSON object.
// We check for its existence and parse it.
if (process.env.FIREBASE_CONFIG && typeof process.env.FIREBASE_CONFIG === 'string') {
  firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
} else {
  // For local development, we fall back to the manually configured file.
  firebaseConfig = localFirebaseConfig;
}

// Initialize Firebase only if it hasn't been initialized yet.
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const storage = getStorage(app);

export { app, storage, auth, firebaseConfig };
