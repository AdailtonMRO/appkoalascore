import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  initializeAuth, 
  getReactNativePersistence 
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check if credentials exist
if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
  console.warn(
    'Firebase credentials not found. Make sure to define EXPO_PUBLIC_FIREBASE_API_KEY and other parameters in your .env file.'
  );
}

const app = initializeApp(firebaseConfig);

// Initialize Auth conditionally
const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });

const db = getFirestore(app);

export { app, auth, db };
