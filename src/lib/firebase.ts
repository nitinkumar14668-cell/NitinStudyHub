import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore for more control if needed, but getFirestore is generally fine.
// We keep the specific databaseId as it's required for multi-database projects.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Error logging in with Google:', error);
    if (error.code === 'auth/popup-blocked') {
      alert('Login popup was blocked! Please allow popups or open in a new tab.');
    } else if (error.code === 'auth/cancelled-popup-request') {
      // User closed the popup, ignore
    } else {
      alert(`Login failed: ${error.message}`);
    }
    throw error;
  }
};
