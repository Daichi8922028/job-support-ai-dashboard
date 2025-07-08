import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // Standard import
import { getFirestore, Timestamp, serverTimestamp, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, query, where, getDocs, onSnapshot, connectFirestoreEmulator, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';

// IMPORTANT: Firebase configuration
// In a real-world application, these values should come from environment variables
// and be handled securely, for example, via a build process (like Vite's import.meta.env or Create React App's REACT_APP_).
// For this exercise, placeholders are used. The application assumes these are correctly populated.
// The `geminiService.ts` file follows a similar pattern for its API key.

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_FIREBASE_AUTH_DOMAIN",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_FIREBASE_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_FIREBASE_MESSAGING_SENDER_ID",
  appId: process.env.FIREBASE_APP_ID || "YOUR_FIREBASE_APP_ID",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);

// Optional: Connect to Firestore Emulator if running locally for development
// if (window.location.hostname === "localhost" && process.env.NODE_ENV === "development") {
//   console.log("Connecting to Firestore Emulator");
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   // You might want to connect Auth emulator too if you use it:
//   // import { connectAuthEmulator } from "firebase/auth";
//   // connectAuthEmulator(auth, "http://localhost:9099");
// }


const googleAuthProvider = new GoogleAuthProvider();

export {
  app,
  auth,
  db,
  googleAuthProvider,
  Timestamp,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  onSnapshot,
  CACHE_SIZE_UNLIMITED
};

// Basic check for placeholder or obviously incorrect format for Firebase API Key.
// This is a heuristic and might not catch all invalid keys.
if (typeof window !== 'undefined') { // Only show warnings in the browser environment
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY" || !firebaseConfig.apiKey.startsWith("AIza")) {
        console.warn(
            "Firebase API key (process.env.FIREBASE_API_KEY) appears to be a placeholder or might be invalid. " +
            "Please verify that you have set your actual Firebase API key in the environment configuration. " +
            "Firebase features may not work correctly."
        );
    }
}
