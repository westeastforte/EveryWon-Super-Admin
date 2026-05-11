"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { UserDoc } from "../types";

const COLLECTION = "users";

export const subscribeUsers = (
  cb: (users: UserDoc[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(collection(getDb(), COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<UserDoc, "id">) }),
      );
      cb(users);
    },
    (err) => onError?.(err),
  );
};

export const blockUser = async (uid: string): Promise<void> => {
  await updateDoc(doc(getDb(), COLLECTION, uid), {
    isBlocked: true,
    blockedAt: Timestamp.now(),
  });
};

export const unblockUser = async (uid: string): Promise<void> => {
  await updateDoc(doc(getDb(), COLLECTION, uid), {
    isBlocked: false,
    blockedAt: null,
  });
};

export const kickUser = async (
  uid: string,
  reason?: string,
): Promise<void> => {
  const res = await fetch("/api/users/kick", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uid, reason }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Server error ${res.status}`);
  }
};
