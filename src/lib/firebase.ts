import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "./firebase-config";

// Initialize Firebase
let app;
try {
  app = getApp();
} catch (error) {
  app = initializeApp(firebaseConfig);
}
const auth = getAuth(app);
const storage = getStorage(app);

export { app, storage, auth, firebaseConfig };
