
import admin from 'firebase-admin';

// Function to initialize the app and return the instance
const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  
  const serviceAccountString = process.env.SERVICE_ACCOUNT_JSON;
  if (!serviceAccountString) {
      throw new Error('Firebase Admin SDK service account credentials are not set.');
  }

  const serviceAccount = JSON.parse(serviceAccountString);
  
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
  });
};

// Singleton instances
let firestore: admin.firestore.Firestore;
let storage: admin.storage.Bucket;

// Getter for Firestore
export const getDb = () => {
  if (!firestore) {
    firestore = admin.firestore(initializeAdminApp());
  }
  return firestore;
};

// Getter for Storage Bucket
export const getBucket = () => {
    if (!storage) {
        storage = admin.storage(initializeAdminApp()).bucket();
    }
    return storage;
}
