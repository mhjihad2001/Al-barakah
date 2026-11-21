import { initializeApp } from 'firebase/app';
import {
  getAnalytics,
  isSupported,
  logEvent,
  type Analytics,
} from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

export const SHARED_FIRESTORE_DATABASE_ID =
  'ai-studio-android-albaraka-2a39cb97-8b11-41d9-ba26-e3cf9f5c2bf9';

export const resolvedFirebaseConfig = {
  ...firebaseConfig,
  apiKey: 'AIzaSyC3KciWzbvImL4UB57g1keBL2YR0d9nMl4',
  authDomain: 'albarakah3526.firebaseapp.com',
  projectId: 'albarakah3526',
  storageBucket: 'albarakah3526.firebasestorage.app',
  messagingSenderId: '318710178792',
  appId: '1:318710178792:web:5ba0c2f1c4a21f55133a5d',
  measurementId: 'G-MSY01KKTRZ',
  firestoreDatabaseId: SHARED_FIRESTORE_DATABASE_ID,
};

export const app = initializeApp(resolvedFirebaseConfig);
export const db = getFirestore(app, SHARED_FIRESTORE_DATABASE_ID);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const functions = getFunctions(app, 'asia-southeast1');

export let analytics: Analytics | null = null;

export const analyticsReady: Promise<Analytics | null> =
  typeof window !== 'undefined'
    ? isSupported()
        .then((supported) => {
          if (supported) {
            analytics = getAnalytics(app);
          }
          return analytics;
        })
        .catch(() => null)
    : Promise.resolve(null);

export function trackAnalyticsEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
    } catch {
      // Ignore analytics errors in offline/restricted environments
    }
    return;
  }
  void analyticsReady.then((instance) => {
    if (instance) {
      try {
        logEvent(instance, eventName, eventParams);
      } catch {
        // Ignore analytics errors in offline/restricted environments
      }
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
