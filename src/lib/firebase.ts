import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, collection, addDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
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
  console.log('Login initiated...');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Login successful:', result.user.email);
    return result.user;
  } catch (error: any) {
    console.error('Firebase Login Error:', error.code, error.message);
    if (error.code === 'auth/unauthorized-domain') {
       alert('Firebase Auth error: This domain is not authorized. Please add ' + window.location.hostname + ' to Authorized Domains in the Firebase Console under Authentication > Settings > Authorized domains.');
    } else if (error.code === 'auth/popup-blocked') {
      alert('Login popup was blocked! Please allow popups or open this site in Chrome/Safari directly (not inside an app like WhatsApp).');
    } else if (error.code === 'auth/cancelled-popup-request') {
      console.log('User cancelled login popup');
    } else if (error.code === 'auth/popup-closed-by-user') {
       console.log('User closed popup');
    } else {
      alert(`Login failed: ${error.message} (${error.code})`);
    }
    throw error;
  }
};

export const logView = async (noteId: string) => {
  try {
    // 1. Log event in views collection
    await addDoc(collection(db, 'views'), {
      noteId,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Error logging view (addDoc views):", err);
  }

  try {
    // 2. Increment counter on the note itself
    await updateDoc(doc(db, 'notes', noteId), {
      viewCount: increment(1)
    });
  } catch (err) {
    console.error("Error logging view (updateDoc notes):", err);
  }
};
