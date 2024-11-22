import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA5oSVZ1WcJq5CixnilGG2qPBn9zCDgeCE",
  authDomain: "xocoin-7695d.firebaseapp.com",
  projectId: "xocoin-7695d",
  storageBucket: "xocoin-7695d.firebasestorage.app",
  messagingSenderId: "83083276225",
  appId: "1:83083276225:web:3d01b4ecdaf53add2d4940",
  measurementId: "G-NEVPNVQYZ7"
};


// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

