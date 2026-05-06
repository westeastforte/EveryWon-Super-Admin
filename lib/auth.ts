"use client";

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { getAuth, getDb } from "./firebase";

export type AuthStatus = "initializing" | "unauthenticated" | "authenticated";

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  role: string | null;
}

export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getAuth(), email, password);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getAuth());
}

async function fetchRole(uid: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(getDb(), "users", uid));
    return (snap.data()?.role as string) ?? null;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    status: "initializing",
    user: null,
    role: null,
  });

  useEffect(() => {
    return onAuthStateChanged(getAuth(), async (user) => {
      if (!user) {
        setState({ status: "unauthenticated", user: null, role: null });
        return;
      }
      const role = await fetchRole(user.uid);
      setState({ status: "authenticated", user, role });
    });
  }, []);

  return state;
}
