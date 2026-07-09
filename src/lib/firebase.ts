import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCyWchUN9lEF0BDcBT_qJadNSEd80HGwzY",
  authDomain: "ss-enterprise-management.firebaseapp.com",
  projectId: "ss-enterprise-management",
  storageBucket: "ss-enterprise-management.firebasestorage.app",
  messagingSenderId: "573766764992",
  appId: "1:573766764992:web:5bd52dcc38adb9626ea025",
  measurementId: "G-P1JLCZK2KQ"
};

// Primary app — used for the logged-in admin session
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary app — used ONLY for creating new users so the admin session
// is never displaced by Firebase auto-signing-in the newly created account
const secondaryAppName = 'secondary-auth';
const secondaryApp = getApps().find(a => a.name === secondaryAppName)
  || initializeApp(firebaseConfig, secondaryAppName);
export const secondaryAuth = getAuth(secondaryApp);
