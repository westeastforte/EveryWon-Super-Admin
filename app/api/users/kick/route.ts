// TODO: re-add auth before production
import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "../../../../lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

// POST /api/users/kick
// Body: { uid: string; reason?: string }
//
// This route:
//  1. Deletes the target user from Firebase Auth (permanent)
//  2. Hard-deletes the user's Firestore doc at users/{uid}
//  3. Adds a bannedEmails/{normalizedEmail} doc — the banlist
//  4. Marks any open reports against this user as actioned/kicked

export async function POST(req: Request) {
  // Parse the request body.
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

  const db = getAdminDb();

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

  // Delete the user from Firebase Auth.
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

  // Hard-delete the Firestore user doc.
  if (userSnap.exists) {
    await db.collection("users").doc(uid).delete();
  }

  // Write to bannedEmails banlist.
  if (targetEmail) {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    await db.collection("bannedEmails").doc(normalizedEmail).set({
      email: normalizedEmail,
      bannedAt: FieldValue.serverTimestamp(),
      bannedBy: "admin",
      reason: reasonStr,
    });
  }

  // Mark any open reports against this user as actioned/kicked.
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
      actionedBy: "admin",
    });
  }
  if (!reportsSnap.empty) {
    await batch.commit();
  }

  return NextResponse.json({ ok: true, uid, email: targetEmail ?? null });
}
