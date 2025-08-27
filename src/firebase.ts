// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBfMDex_Mul0eft3PD8JLkqib36B1iGpvM",
  authDomain: "now-and-later-9542b.firebaseapp.com",
  databaseURL: "https://now-and-later-9542b-default-rtdb.firebaseio.com",
  projectId: "now-and-later-9542b",
  storageBucket: "now-and-later-9542b.firebasestorage.app",
  messagingSenderId: "70895401239",
  appId: "1:70895401239:web:5b2455413d0745a3aa9f52",
  measurementId: "G-VF0PNS6LE5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
  } catch (error) {
    console.log("Emulators already connected or not available");
  }
}

export { app, analytics, auth, db };

