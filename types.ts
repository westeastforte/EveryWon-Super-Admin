import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

// Shape stored in Firestore `users/{uid}`. Created by the mobile app on
// sign-up. The admin writes only `isBlocked`, `blockedAt`, and `deletedAt`.
export interface UserDoc {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;           // e.g. "user", "admin", "superAdmin"
  isBlocked?: boolean;
  blockedAt?: Timestamp | null;
  createdAt?: Timestamp | string | null;
  updatedAt?: Timestamp | string | null;
  deletedAt?: Timestamp | null;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

// Shape stored in Firestore `reports/{id}`. Written by the mobile app when a
// user reports another user. The mobile app schema is assumed (no report
// feature was found in the mobile codebase at the time of this build).
// Fields that may differ in the live DB are marked optional.
export interface ReportDoc {
  id: string;
  reportedUserId: string;
  reportedUserEmail?: string;
  reportedBy: string;           // uid of the reporter
  reporterEmail?: string;
  // What the report is actually against. The mobile app writes these for
  // post/comment reports; older user-only reports omit them (treat as
  // "user"). Block/kick still act on `reportedUserId` (the author).
  targetType?: "user" | "post" | "comment";
  targetId?: string;            // user uid, post id, or comment id
  targetPostId?: string | null; // parent post id for comment reports
  reason: string;
  details?: string;
  status: "pending" | "reviewed" | "actioned" | "dismissed";
  action?: "warned" | "blocked" | "kicked" | "dismissed";
  createdAt: Timestamp;
  actionedAt?: Timestamp | null;
  actionedBy?: string;          // admin uid
}

// ---------------------------------------------------------------------------
// Banlist
// ---------------------------------------------------------------------------

// Shape stored in Firestore `bannedEmails/{normalizedEmail}`.
// Written by /api/users/kick when a user is permanently removed.
// TODO: enforcement on signup requires either a Firebase Auth beforeCreate
// blocking function or a signup-side check in the mobile app — the banlist
// data is ready here, but that enforcement work is out of scope for this PR.
export interface BannedEmailDoc {
  email: string;
  bannedAt: Timestamp;
  bannedBy: string;   // admin uid
  reason?: string;
}

// ---------------------------------------------------------------------------
// Clinics
// ---------------------------------------------------------------------------

// Shape stored in Firestore `clinics/{id}`. Mirrors the patient app's
// `types/dashboard.ts` Clinic interface — keep the field names in sync
// or the patient app's `adaptDashClinicToApp` will drop them.
export interface ClinicDoc {
  id: string;
  name: string;
  nameEn?: string;
  nameKr?: string;
  address: string;
  addressText: string;
  addressDetail?: string;
  region?: string;
  district?: string;
  geo?: { lat: number; lng: number };
  category: string;
  hours: string;
  isOpen: boolean;
  availableSlots: number;
  waitTime: number;
  rating: number;
  services: { name: string; price: number }[];
  doctors: {
    id: string;
    name: string;
    nameKr: string;
    specialty: string;
    experience: number;
    education: string;
    languages: string[];
  }[];
  phone: string;
  englishAvailable: boolean;
  isActive: boolean;
  isVerified?: boolean;
  bookable: boolean;  // true = clinic uses dashboard and accepts appointments; false = info-only listing
  createdAt: string;
  updatedAt: string;
}

export interface ClinicFormInput {
  nameKr: string;
  nameEn?: string;
  address: string;
  addressDetail?: string;
  region?: string;
  district?: string;
  geo?: { lat: number; lng: number };
  category: string;
  phone?: string;
  hours?: string;
  englishAvailable: boolean;
}
