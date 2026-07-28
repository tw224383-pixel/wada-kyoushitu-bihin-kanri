import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMN7do_mOGWk1BKrk3Gn6ujOwIfcy5bNg",
  authDomain: "kyoushitu-bihin-kanri.firebaseapp.com",
  projectId: "kyoushitu-bihin-kanri",
  storageBucket: "kyoushitu-bihin-kanri.firebasestorage.app",
  messagingSenderId: "829437474919",
  appId: "1:829437474919:web:588f39d0d78a7db8003cc2",
  measurementId: "G-HMBSSQKX8H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
