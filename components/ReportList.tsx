"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  dismissReport,
  markReportActioned,
  subscribeReports,
} from "../lib/reports";
import { blockUser, kickUser } from "../lib/users";
import type { ReportDoc } from "../types";
import { Timestamp } from "firebase/firestore";

type Tab = "pending" | "reviewed" | "all";

function fmtDate(val: Timestamp | null | undefined): string {
  if (!val) return "—";
  try {
    return val.toDate().toLocaleString();
  } catch {
    return "—";
  }
}

const STATUS_BADGE: Record<
  ReportDoc["status"],
  { label: string; bg: string; color: string }
> = {
  pending: { label: "Pending", bg: "#fef9c3", color: "#854d0e" },
  reviewed: { label: "Reviewed", bg: "#dbeafe", color: "#1e40af" },
  actioned: { label: "Actioned", bg: "#dcfce7", color: "#15803d" },
  dismissed: { label: "Dismissed", bg: "var(--color-subtle)", color: "var(--color-ink-3)" },
};

export default function ReportList() {
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  useEffect(() => {
    const unsub = subscribeReports(
      (rs) => {
        setReports(rs);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setReports([]);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return null;
    if (tab === "all") return reports;
    return reports.filter((r) => r.status === tab);
  }, [reports, tab]);

  const adminUid = (): string => "admin";

  const onDismiss = async (r: ReportDoc) => {
    if (!window.confirm(`Dismiss this report (${r.reason})?`)) return;
    setBusyId(r.id);
    try {
      await dismissReport(r.id, adminUid());
    } catch (err) {
      window.alert(`Dismiss failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const onBlockUser = async (r: ReportDoc) => {
    if (
      !window.confirm(
        `Block user "${r.reportedUserEmail || r.reportedUserId}"? They will be unable to use the app.`,
      )
    )
      return;
    setBusyId(r.id);
    try {
      await blockUser(r.reportedUserId);
      await markReportActioned(r.id, "blocked", adminUid());
    } catch (err) {
      window.alert(`Block failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const onKickUser = async (r: ReportDoc) => {
    if (
      !window.confirm(
        `PERMANENTLY DELETE & BAN "${r.reportedUserEmail || r.reportedUserId}"?\n\nThis will:\n• Delete their Firebase Auth account\n• Delete their Firestore user doc\n• Add their email to the banlist\n\nThis cannot be undone.`,
      )
    )
      return;
    setBusyId(r.id);
    try {
      await kickUser(r.reportedUserId, `Report: ${r.reason}`);
      // The kick API route marks related reports as actioned/kicked server-side.
    } catch (err) {
      window.alert(`Kick failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "reviewed", label: "Reviewed" },
    { key: "all", label: "All" },
  ];

  const countByStatus = (s: Tab) => {
    if (!reports) return null;
    if (s === "all") return reports.length;
    return reports.filter((r) => r.status === s).length;
  };

  return (
    <section
      className="bg-white border rounded-xl overflow-hidden"
      style={{ borderColor: "var(--color-rule)" }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-2.5 border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        {tabs.map(({ key, label }) => {
          const isOn = tab === key;
          const count = countByStatus(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors"
              style={
                isOn
                  ? {
                      background: "var(--color-accent)",
                      color: "var(--color-accent-fg)",
                    }
                  : {
                      color: "var(--color-ink-2)",
                    }
              }
            >
              {label}
              {count !== null && (
                <span
                  className="text-[10px] tabular px-1.5 py-0.5 rounded-full font-semibold"
                  style={
                    isOn
                      ? {
                          background: "rgba(255,255,255,0.25)",
                          color: "inherit",
                        }
                      : {
                          background: "var(--color-subtle)",
                          color: "var(--color-ink-3)",
                        }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          className="text-[13px] px-4 py-3 border-b"
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            borderColor: "var(--color-rule)",
          }}
        >
          {error}
        </div>
      )}

      {filtered === null && <EmptyRow text="Loading…" />}
      {filtered && filtered.length === 0 && !error && (
        <EmptyRow
          text={
            tab === "pending"
              ? "No pending reports."
              : tab === "reviewed"
                ? "No reviewed reports."
                : "No reports found."
          }
        />
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr
                className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  borderBottom: "1px solid var(--color-rule)",
                  color: "var(--color-ink-3)",
                }}
              >
                <th className="px-4 py-2.5 font-semibold">Reported User</th>
                <th className="px-4 py-2.5 font-semibold">Reporter</th>
                <th className="px-4 py-2.5 font-semibold">Reason</th>
                <th className="px-4 py-2.5 font-semibold">Filed</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
              {filtered.map((r) => {
                const busy = busyId === r.id;
                const badge = STATUS_BADGE[r.status];
                const isOpen = r.status === "pending" || r.status === "reviewed";
                return (
                  <tr
                    key={r.id}
                    style={{ borderColor: "var(--color-rule)" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/users/${r.reportedUserId}`}
                          className="font-semibold text-[12.5px] hover:underline truncate max-w-[160px]"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {r.reportedUserEmail || r.reportedUserId}
                        </Link>
                        <span
                          className="font-mono text-[10.5px] truncate max-w-[160px]"
                          style={{ color: "var(--color-ink-3)" }}
                        >
                          {r.reportedUserId}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-[12px] truncate max-w-[160px]"
                      style={{ color: "var(--color-ink-2)" }}
                    >
                      {r.reporterEmail || r.reportedBy}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <span
                          className="font-semibold truncate"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {r.reason}
                        </span>
                        {r.details && (
                          <span
                            className="text-[11.5px] truncate"
                            style={{ color: "var(--color-ink-3)" }}
                            title={r.details}
                          >
                            {r.details}
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-[11.5px]"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      {fmtDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                        {r.action ? ` / ${r.action}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isOpen ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onDismiss(r)}
                            disabled={busy}
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border text-[11.5px] font-semibold transition-colors hover:bg-[var(--color-subtle)] disabled:opacity-50"
                            style={{
                              color: "var(--color-ink-2)",
                              borderColor: "var(--color-rule)",
                            }}
                          >
                            {busy ? "…" : "Dismiss"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onBlockUser(r)}
                            disabled={busy}
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border text-[11.5px] font-semibold transition-colors hover:border-amber-400 hover:text-amber-700 disabled:opacity-50"
                            style={{
                              color: "var(--color-ink-2)",
                              borderColor: "var(--color-rule)",
                            }}
                          >
                            {busy ? "…" : "Block user"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onKickUser(r)}
                            disabled={busy}
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border text-[11.5px] font-semibold transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                            style={{
                              color: "var(--color-ink-2)",
                              borderColor: "var(--color-rule)",
                            }}
                          >
                            {busy ? "…" : "Kick"}
                          </button>
                        </div>
                      ) : (
                        <span
                          className="text-[11.5px]"
                          style={{ color: "var(--color-ink-3)" }}
                        >
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      className="px-4 py-10 text-center text-[13px]"
      style={{ color: "var(--color-ink-3)" }}
    >
      {text}
    </div>
  );
}
