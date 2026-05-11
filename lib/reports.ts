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
import type { ReportDoc } from "../types";

const COLLECTION = "reports";

export const subscribeReports = (
  cb: (reports: ReportDoc[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(
    collection(getDb(), COLLECTION),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const reports = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<ReportDoc, "id">) }),
      );
      cb(reports);
    },
    (err) => onError?.(err),
  );
};

export const dismissReport = async (
  reportId: string,
  adminUid: string,
): Promise<void> => {
  await updateDoc(doc(getDb(), COLLECTION, reportId), {
    status: "dismissed",
    action: "dismissed",
    actionedAt: Timestamp.now(),
    actionedBy: adminUid,
  });
};

export const markReportActioned = async (
  reportId: string,
  action: ReportDoc["action"],
  adminUid: string,
): Promise<void> => {
  await updateDoc(doc(getDb(), COLLECTION, reportId), {
    status: "actioned",
    action,
    actionedAt: Timestamp.now(),
    actionedBy: adminUid,
  });
};
