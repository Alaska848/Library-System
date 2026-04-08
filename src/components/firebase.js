import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCc4-s-zKa74iTauana6Y5uG3DPsdnjJN4",
  authDomain: "elibraryll.firebaseapp.com",
  projectId: "elibraryll",
  storageBucket: "elibraryll.appspot.com",  // الصح
  messagingSenderId: "250468753439",
  appId: "1:250468753439:web:3e6e2c49cb25c636b6352a",
  measurementId: "G-EPGN45LL4W"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;