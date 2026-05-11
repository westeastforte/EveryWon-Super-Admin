import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "../../../../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// POST /api/users/kick
// Body: { uid: string; reason?: string }
// Auth: Bearer <Firebase ID token of a superAdmin user>
//
// This route:
//  1. Verifies the caller's ID token and confirms role === "superAdmin"
//  2. Deletes the target user from Firebase Auth (permanent)
//  3. Hard-deletes the user's Firestore doc at users/{uid}
//  4. Adds a bannedEmails/{normalizedEmail} doc — the banlist
//  5. Marks any open reports against this user as actioned/kicked
//
// TODO: To enforce the banlist on new signups, add a Firebase Auth
// beforeCreate blocking function in the mobile app's Cloud Functions that
// checks `bannedEmails/{email}` and throws if found. That work is out of
// scope for this PR — the banlist data is ready here.

export async function POST(req: Request) {
  // 1. Extract and verify the caller's ID token.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
  }

  let callerUid: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    callerUid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });
  }

  // Confirm caller is superAdmin in Firestore.
  const db = getAdminDb();
  const callerSnap = await db.collection("users").doc(callerUid).get();
  const callerRole = callerSnap.data()?.role as string | undefined;
  if (callerRole !== "superAdmin") {
    return NextResponse.json({ error: "Forbidden — superAdmin only" }, { status: 403 });
  }

  // 2. Parse the request body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const uid = (body as { uid?: unknown })?.uid;
  if (typeof uid !== "string" || !uid.trim()) {
    return NextResponse.json({ error: "uid required" }, { status: 400 });
  }
  const reason = (body as { reason?: unknown })?.reason;
  const reasonStr = typeof reason === "string" ? reason.trim() : "Kicked by admin";

  // Fetch the target user's email before we delete anything.
  let targetEmail: string | undefined;
  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.exists) {
    targetEmail = userSnap.data()?.email as string | undefined;
  }

  // Also try Firebase Auth for the email (in case the Firestore doc is thin).
  if (!targetEmail) {
    try {
      const authUser = await getAdminAuth().getUser(uid);
      targetEmail = authUser.email;
    } catch {
      // User may not exist in Auth — continue regardless.
    }
  }

  // 3. Delete the user from Firebase Auth.
  try {
    await getAdminAuth().deleteUser(uid);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    // auth/user-not-found is fine — maybe already deleted.
    if (code !== "auth/user-not-found") {
      return NextResponse.json(
        { error: `Auth delete failed: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 },
      );
    }
  }

  // 4. Hard-delete the Firestore user doc.
  if (userSnap.exists) {
    await db.collection("users").doc(uid).delete();
  }

  // 5. Write to bannedEmails banlist.
  if (targetEmail) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    await db.collection("bannedEmails").doc(normalizedEmail).set({
      email: normalizedEmail,
      bannedAt: FieldValue.serverTimestamp(),
      bannedBy: callerUid,
      reason: reasonStr,
    });
  }

  // 6. Mark any open reports against this user as actioned/kicked.
  const reportsSnap = await db
    .collection("reports")
    .where("reportedUserId", "==", uid)
    .where("status", "in", ["pending", "reviewed"])
    .get();

  const batch = db.batch();
  for (const rDoc of reportsSnap.docs) {
    batch.update(rDoc.ref, {
      status: "actioned",
      action: "kicked",
      actionedAt: FieldValue.serverTimestamp(),
      actionedBy: callerUid,
    });
  }
  if (!reportsSnap.empty) {
    await batch.commit();
  }

  return NextResponse.json({ ok: true, uid, email: targetEmail ?? null });
}
