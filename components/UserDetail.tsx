"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot, query, collection, where } from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { blockUser, kickUser, unblockUser } from "../lib/users";
import type { ReportDoc, UserDoc } from "../types";
import { Timestamp } from "firebase/firestore";

function fmtDate(val: unknown): string {
  if (!val) return "—";
  try {
    if (val instanceof Timestamp) return val.toDate().toLocaleString();
    if (typeof val === "string") return new Date(val).toLocaleString();
  } catch {
    // fall through
  }
  return "—";
}

function Row({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  const v = value && String(value).trim() ? String(value) : "—";
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? "sm:col-span-2" : ""}`}>
      <dt
        className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-ink-3)" }}
      >
        {label}
      </dt>
      <dd
        className={`m-0 break-words text-[13.5px] ${mono ? "font-mono tabular text-[12.5px]" : ""}`}
        style={{ color: v === "—" ? "var(--color-ink-3)" : "var(--color-ink)" }}
      >
        {v}
      </dd>
    </div>
  );
}

const STATUS_BADGE: Record<
  ReportDoc["status"],
  { label: string; bg: string; color: string }
> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e" },
  reviewed: { label: "Reviewed", bg: "#dbeafe", color: "#1e40af" },
  actioned: { label: "Actioned", bg: "#dcfce7", color: "#15803d" },
  dismissed: {
    label: "Dismissed",
    bg: "var(--color-subtle)",
    color: "var(--color-ink-3)",
  },
};

export default function UserDetail({ id }: { id: string }) {
  const [user, setUser] = useState<UserDoc | null | "loading">("loading");
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    // One-time fetch for user doc.
    let cancelled = false;
    getDoc(doc(getDb(), "users", id))
      .then((snap) => {
        if (cancelled) return;
        setUser(
          snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) })
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    // Real-time subscription to reports filed against this user.
    //
    // Equality filter only — no orderBy — so this is served by single-field
    // indexes and needs NO composite index (this project has no Firestore
    // index deploy pipeline). The result set per user is small, so we sort
    // newest-first client-side instead.
    const toMillis = (v: ReportDoc["createdAt"]): number => {
      if (!v) return 0;
      if (v instanceof Timestamp) return v.toMillis();
      if (typeof v === "string") {
        const t = Date.parse(v);
        return Number.isNaN(t) ? 0 : t;
      }
      return 0;
    };
    const q = query(
      collection(getDb(), "reports"),
      where("reportedUserId", "==", id),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ReportDoc, "id">),
        }));
        docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setReportsError(null);
        setReports(docs);
      },
      (err) => {
        // Surface the failure instead of silently rendering "No reports
        // found" — a swallowed error here hides real reports from moderators.
        console.error("reports subscription failed", err);
        setReportsError(err instanceof Error ? err.message : String(err));
        setReports([]);
      },
    );
    return () => unsub();
  }, [id]);

  const onBlock = async () => {
    if (!user || user === "loading") return;
    if (!window.confirm("Block this user?")) return;
    setBusyAction("block");
    try {
      await blockUser(id);
      setUser((prev) =>
        prev && prev !== "loading" ? { ...prev, isBlocked: true } : prev,
      );
    } catch (err) {
      window.alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const onUnblock = async () => {
    if (!user || user === "loading") return;
    if (!window.confirm("Unblock this user?")) return;
    setBusyAction("unblock");
    try {
      await unblockUser(id);
      setUser((prev) =>
        prev && prev !== "loading" ? { ...prev, isBlocked: false } : prev,
      );
    } catch (err) {
      window.alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyAction(null);
    }
  };

  const onKick = async () => {
    if (
      !window.confirm(
        "PERMANENTLY DELETE & BAN this user?\n\nThis cannot be undone.",
      )
    )
      return;
    setBusyAction("kick");
    try {
      await kickUser(id, "Kicked via user detail page");
    } catch (err) {
      window.alert(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyAction(null);
    }
  };

  if (user === "loading") {
    return <Card>Loading…</Card>;
  }
  if (!user) {
    return (
      <Card>
        User not found (may have been deleted).{" "}
        <Link href="/users" className="underline font-semibold">
          Back to users
        </Link>
      </Card>
    );
  }

  const displayName = user.displayName || user.name;
  const busy = busyAction !== null;

  return (
    <div className="flex flex-col gap-4">
      <section
        className="bg-white border rounded-xl p-6"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex flex-col gap-1 min-w-0">
            <h2
              className="text-[20px] font-bold m-0 truncate"
              style={{ color: "var(--color-ink)" }}
            >
              {displayName || user.email || user.id}
            </h2>
            {displayName && user.email && (
              <span
                className="text-[14px] font-mono truncate"
                style={{ color: "var(--color-ink-2)" }}
              >
                {user.email}
              </span>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border"
                style={{
                  color: "var(--color-ink-2)",
                  borderColor: "var(--color-rule)",
                  background: "var(--color-subtle)",
                }}
              >
                {user.role ?? "user"}
              </span>
              <span
                className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
                style={
                  user.isBlocked
                    ? { background: "var(--color-danger-soft)", color: "var(--color-danger)" }
                    : { background: "#dcfce7", color: "#15803d" }
                }
              >
                {user.isBlocked ? "Blocked" : "Active"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user.isBlocked ? (
              <button
                type="button"
                onClick={onUnblock}
                disabled={busy}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-[12px] font-semibold transition-colors hover:bg-[var(--color-subtle)] disabled:opacity-50"
                style={{
                  color: "var(--color-ink-2)",
                  borderColor: "var(--color-rule)",
                }}
              >
                {busyAction === "unblock" ? "…" : "Unblock"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onBlock}
                disabled={busy}
                className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-[12px] font-semibold transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                style={{
                  color: "var(--color-ink-2)",
                  borderColor: "var(--color-rule)",
                }}
              >
                {busyAction === "block" ? "…" : "Block"}
              </button>
            )}
            <button
              type="button"
              onClick={onKick}
              disabled={busy}
              className="inline-flex items-center justify-center h-9 px-3 rounded-md text-[12px] font-semibold transition-colors disabled:opacity-50"
              style={{
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
              }}
            >
              {busyAction === "kick" ? "Deleting…" : "Delete + Banlist"}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          <Row label="UID" value={user.id} mono wide />
          <Row label="Display Name" value={user.displayName} />
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email} mono />
          <Row label="Photo URL" value={user.photoURL} wide />
          <Row label="Role" value={user.role} />
          <Row label="Status" value={user.isBlocked ? "Blocked" : "Active"} />
          <Row label="Blocked At" value={fmtDate(user.blockedAt)} mono />
          <Row label="Created At" value={fmtDate(user.createdAt)} mono />
          <Row label="Updated At" value={fmtDate(user.updatedAt)} mono />
        </dl>
      </section>

      {/* Reports against this user */}
      <section
        className="bg-white border rounded-xl overflow-hidden"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div
          className="px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <h3
            className="text-[14px] font-semibold m-0"
            style={{ color: "var(--color-ink)" }}
          >
            Reports filed against this user
          </h3>
        </div>

        {reports === null && (
          <div
            className="px-4 py-8 text-center text-[13px]"
            style={{ color: "var(--color-ink-3)" }}
          >
            Loading…
          </div>
        )}
        {reportsError && (
          <div
            className="px-4 py-8 text-center text-[13px]"
            style={{ color: "var(--color-danger, #c0362c)" }}
          >
            Could not load reports — {reportsError}
          </div>
        )}
        {!reportsError && reports && reports.length === 0 && (
          <div
            className="px-4 py-8 text-center text-[13px]"
            style={{ color: "var(--color-ink-3)" }}
          >
            No reports found.
          </div>
        )}
        {reports && reports.length > 0 && (
          <ul className="list-none p-0 m-0 divide-y" style={{ borderColor: "var(--color-rule)" }}>
            {reports.map((r) => {
              const badge = STATUS_BADGE[r.status];
              return (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 px-5 py-3"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="font-semibold text-[13px]"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {r.reason}
                    </span>
                    {r.details && (
                      <span
                        className="text-[12px]"
                        style={{ color: "var(--color-ink-2)" }}
                      >
                        {r.details}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-mono"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      Reported by: {r.reporterEmail || r.reportedBy} &middot;{" "}
                      {fmtDate(r.createdAt)}
                    </span>
                  </div>
                  <span
                    className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                    {r.action ? ` / ${r.action}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href="/users"
        className="text-[13px] font-semibold self-start"
        style={{ color: "var(--color-ink-2)" }}
      >
        &larr; Back to users
      </Link>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="bg-white border rounded-xl px-5 py-6 text-[13.5px]"
      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }}
    >
      {children}
    </section>
  );
}
