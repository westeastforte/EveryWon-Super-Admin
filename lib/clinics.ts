"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { ClinicDoc, ClinicFormInput } from "../types";

const COLLECTION = "clinics";

// Per-request cap on /api/translate. Match this to MAX_ITEMS in the
// route — sending more would 400.
const TRANSLATE_CHUNK = 50;

// Best-effort English-name fill via /api/translate (Gemini). Translation
// is non-fatal: if Gemini is misconfigured or fails, we return undefineds
// and the clinic is still written without nameEn — the patient app falls
// back to nameKr / name on display.
const fetchTranslations = async (
  items: { nameKr: string; address?: string }[],
): Promise<(string | undefined)[]> => {
  if (items.length === 0) return [];
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) return items.map(() => undefined);
    const data = (await res.json()) as { translations?: unknown };
    if (!Array.isArray(data.translations)) return items.map(() => undefined);
    return data.translations.map((v) => {
      const s = typeof v === "string" ? v.trim() : "";
      return s || undefined;
    });
  } catch {
    return items.map(() => undefined);
  }
};

// Build a complete Clinic document from the minimal admin form. Defaults
// match what the patient app's `adaptDashClinicToApp` (in
// `data/clinicsRepo.ts`) expects so freshly-registered clinics render
// correctly in the patient list and on the map.
const buildDoc = (
  input: ClinicFormInput,
): Omit<ClinicDoc, "id"> => {
  const now = new Date().toISOString();
  const displayName = input.nameKr || input.nameEn || "Unnamed clinic";

  return {
    name: displayName,
    nameKr: input.nameKr || undefined,
    nameEn: input.nameEn?.trim() || undefined,
    address: input.address,
    addressText: input.address,
    addressDetail: input.addressDetail?.trim() || undefined,
    region: input.region,
    district: input.district,
    geo: input.geo,
    category: input.category || "general",
    hours: input.hours?.trim() || "—",
    isOpen: true,
    availableSlots: 0,
    waitTime: 0,
    rating: 0,
    services: [],
    doctors: [],
    phone: input.phone?.trim() || "",
    englishAvailable: Boolean(input.englishAvailable),
    isActive: true,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  };
};

export const createClinic = async (input: ClinicFormInput): Promise<string> => {
  let final = input;
  if (input.nameKr && !input.nameEn?.trim()) {
    const [translated] = await fetchTranslations([
      { nameKr: input.nameKr, address: input.address },
    ]);
    if (translated) final = { ...input, nameEn: translated };
  }
  const ref = await addDoc(collection(getDb(), COLLECTION), buildDoc(final));
  return ref.id;
};

// Firestore batched writes are capped at 500 ops. We chunk so a CSV with
// thousands of rows still completes — each chunk is a single round-trip.
const BATCH_SIZE = 400;

export interface BulkResult {
  written: number;
  failed: number;
  errors: string[];
}

export type BulkPhase = "translating" | "writing";

export const createClinicsBulk = async (
  inputs: ClinicFormInput[],
  onProgress?: (done: number, total: number, phase: BulkPhase) => void,
): Promise<BulkResult> => {
  const db = getDb();
  const total = inputs.length;
  let written = 0;
  let failed = 0;
  const errors: string[] = [];

  // Phase 1: fill in English names for rows that have nameKr but no
  // nameEn. We resolve in-place into a parallel array so a translation
  // failure on one chunk doesn't block the rest of the import.
  const needsTranslate: { idx: number; nameKr: string; address?: string }[] = [];
  inputs.forEach((it, idx) => {
    if (it.nameKr && !it.nameEn?.trim()) {
      needsTranslate.push({ idx, nameKr: it.nameKr, address: it.address });
    }
  });
  const enriched = inputs.slice();
  if (needsTranslate.length > 0) {
    onProgress?.(0, needsTranslate.length, "translating");
    let done = 0;
    for (let i = 0; i < needsTranslate.length; i += TRANSLATE_CHUNK) {
      const slice = needsTranslate.slice(i, i + TRANSLATE_CHUNK);
      const out = await fetchTranslations(
        slice.map(({ nameKr, address }) => ({ nameKr, address })),
      );
      slice.forEach((entry, j) => {
        const en = out[j];
        if (en) enriched[entry.idx] = { ...enriched[entry.idx], nameEn: en };
      });
      done += slice.length;
      onProgress?.(done, needsTranslate.length, "translating");
    }
  }

  // Phase 2: chunked Firestore writes (unchanged logic).
  onProgress?.(0, total, "writing");
  for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
    const slice = enriched.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const input of slice) {
      const ref = doc(collection(db, COLLECTION));
      batch.set(ref, buildDoc(input));
    }
    try {
      await batch.commit();
      written += slice.length;
    } catch (err) {
      failed += slice.length;
      errors.push(err instanceof Error ? err.message : String(err));
    }
    onProgress?.(Math.min(i + BATCH_SIZE, total), total, "writing");
  }

  return { written, failed, errors };
};

export const deleteClinic = async (id: string): Promise<void> => {
  await deleteDoc(doc(getDb(), COLLECTION, id));
};

export const getClinic = async (id: string): Promise<ClinicDoc | null> => {
  const snap = await getDoc(doc(getDb(), COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ClinicDoc, "id">) };
};

// Partial update. We always bump updatedAt and strip undefined keys —
// Firestore rejects undefined values, and an undefined-overwrite would
// blank out a field unintentionally. To explicitly clear a field, pass
// null.
export const updateClinic = async (
  id: string,
  patch: Partial<Omit<ClinicDoc, "id" | "createdAt">>,
): Promise<void> => {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) cleaned[k] = v;
  }
  cleaned.updatedAt = new Date().toISOString();
  await updateDoc(doc(getDb(), COLLECTION, id), cleaned);
};

// Translate a single clinic name via /api/translate and persist nameEn.
// Returns the new English name (or null on failure). Used by the manual
// "Translate" action on the clinics list / detail pages.
export const translateClinicNow = async (
  id: string,
  nameKr: string,
  address?: string,
): Promise<string | null> => {
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: [{ nameKr, address }] }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { translations?: unknown };
    const list = Array.isArray(data.translations) ? data.translations : [];
    const en = typeof list[0] === "string" ? list[0].trim() : "";
    if (!en) return null;
    await updateClinic(id, { nameEn: en });
    return en;
  } catch {
    return null;
  }
};

export const subscribeClinics = (
  cb: (clinics: ClinicDoc[]) => void,
  onError?: (err: Error) => void,
): (() => void) => {
  const q = query(collection(getDb(), COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const clinics = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<ClinicDoc, "id">) }),
      );
      cb(clinics);
    },
    (err) => onError?.(err),
  );
};
