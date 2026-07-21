// Firebase Configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCuPOfwtjdZx6E6V7dI-o3ZZCh9labNmqs",
  authDomain: "lifeline-ai-da349.firebaseapp.com",
  projectId: "lifeline-ai-da349",
  storageBucket: "lifeline-ai-da349.firebasestorage.app",
  messagingSenderId: "169924816484",
  appId: "1:169924816484:web:fbde7a00b248d66d69b971",
  measurementId: "G-7TZDNMG1YV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;