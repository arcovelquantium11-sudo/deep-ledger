import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// ------------------------------------------------------------------
// IMPORTANT: CONFIGURATION REQUIRED
// You must replace the values below with your own Firebase project config.
// Visit https://console.firebase.google.com/ to create a project,
// then navigate to Project Settings > General > Your Apps > SDK Setup and Configuration.
// ------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

let app;
let auth: any;
let googleProvider: any;

try {
  // Simple check to prevent initialization with placeholders which would crash the app
  if (firebaseConfig.apiKey.includes("REPLACE_WITH")) {
    console.warn("Firebase config is missing. Please update services/firebase.ts");
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export { auth, googleProvider, firebaseConfig };