import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Usar initializeFirestore com forceLongPolling para garantir conectividade em ambientes de proxy/iframe
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isSignInInProgress = false;

export async function signInWithGoogle() {
  if (isSignInInProgress) {
    console.warn("Sign-in already in progress");
    return null;
  }
  
  isSignInInProgress = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/cancelled-popup-request') {
      console.warn("Sign-in popup was closed or cancelled");
      return null;
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      console.warn("User closed the login popup");
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      console.warn("Login popup was blocked by the browser");
      alert("O popup de login foi bloqueado. Por favor, habilite popups para este site.");
      return null;
    }
    console.error("Error signing in with Google", error);
    throw error;
  } finally {
    isSignInInProgress = false;
  }
}

async function testConnection() {
  try {
    console.log("Testing Firestore connection with DB ID:", firebaseConfig.firestoreDatabaseId);
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test successful.");
  } catch (error) {
    if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Please check your Firebase configuration. The client is offline or the database is unavailable.");
    } else {
      console.error("Connection test failed with error:", error);
    }
  }
}

testConnection();

export { onAuthStateChanged, updateProfile };
export type { FirebaseUser };
