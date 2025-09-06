import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK for server-side operations
let adminApp;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    let credential;
    
    // In production (Firebase App Hosting), use application default credentials
    // In development, use service account key from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Local development with service account key
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = cert(serviceAccount);
    } else {
      // Production environment with application default credentials
      credential = applicationDefault();
    }
    
    adminApp = initializeApp({
      credential: credential,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  } else {
    adminApp = getApps()[0];
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  throw error;
}

export const adminDb = getFirestore(adminApp);
export default adminApp;
