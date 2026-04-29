"use client";

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";

// Firebase web config keys are not secrets — they identify the project.
// Security for clinic writes is enforced by the shared Firestore rules
// in the patient/dashboard project. Read from NEXT_PUBLIC_* env vars so
// the same project ID can be swapped for staging without a code change.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
};

export const getDb = (): Firestore => {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
};

export const hasFirebaseConfig = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
