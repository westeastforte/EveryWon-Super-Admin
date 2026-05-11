"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { blockUser, kickUser, subscribeUsers, unblockUser } from "../lib/users";
import type { UserDoc } from "../types";
import { IconBan, IconSearch } from "./Icons";
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

function UserAvatar({ user }: { user: UserDoc }) {
  const initial = (user.displayName || user.name || user.email || "?")
    .charAt(0)
    .toUpperCase();
  if (user.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt={initial}
        className="w-8 h-8 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{ background: "var(--color-subtle)", color: "var(--color-ink-2)" }}
    >
      {initial}
    </span>
  );
}

export default function UserList() {
  const [users, setUsers] = useState<UserDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const unsub = subscribeUsers(
      (us) => {
        setUsers(us);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setUsers([]);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.displayName, u.email, u.role]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }, [users, filter]);

  const onBlock = async (u: UserDoc) => {
    const label = u.displayName || u.name || u.email || u.id;
    if (!window.confirm(`Block "${label}"? They will be unable to use the app.`))
      return;
    setBusyId(u.id);
    try {
      await blockUser(u.id);
    } catch (err) {
      window.alert(`Block failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const onUnblock = async (u: UserDoc) => {
    const label = u.displayName || u.name || u.email || u.id;
    if (!window.confirm(`Unblock "${label}"?`)) return;
    setBusyId(u.id);
    try {
      await unblockUser(u.id);
    } catch (err) {
      window.alert(`Unblock failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const onKick = async (u: UserDoc) => {
    const label = u.displayName || u.name || u.email || u.id;
    if (
      !window.confirm(
        `PERMANENTLY DELETE & BAN "${label}"?\n\nThis will:\n• Delete their Firebase Auth account\n• Delete their Firestore user doc\n• Add their email to the banlist\n\nThis cannot be undone.`,
      )
    )
      return;
    setBusyId(u.id);
    try {
      await kickUser(u.id, "Kicked via admin console");
    } catch (err) {
      window.alert(`Kick failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className="bg-white border rounded-xl overflow-hidden"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="flex items-center gap-2 flex-1">
          <IconSearch
            className="shrink-0"
            width={16}
            height={16}
            color="var(--color-ink-3)"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or email"
            className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-[var(--color-ink-3)]"
          />
        </div>
        <span
          className="text-[11px] font-semibold tabular px-2 py-0.5 rounded-md border"
          style={{
            color: "var(--color-ink-2)",
            borderColor: "var(--color-rule)",
            background: "var(--color-subtle)",
          }}
        >
          {filtered?.length ?? "—"}
          {filter && users ? ` / ${users.length}` : ""}
        </span>
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
        <EmptyRow text={filter ? "No users match that search." : "No users found."} />
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
                <th className="px-4 py-2.5 font-semibold">User</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
                <th className="px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-rule)" }}>
              {filtered.map((u) => {
                const busy = busyId === u.id;
                const displayName = u.displayName || u.name || "—";
                return (
                  <tr
                    key={u.id}
                    style={{ borderColor: "var(--color-rule)" }}
                    className={u.isBlocked ? "opacity-60" : ""}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={u} />
                        <span
                          className="font-semibold truncate max-w-[140px]"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {displayName}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-[12px] truncate max-w-[200px]"
                      style={{ color: "var(--color-ink-2)" }}
                    >
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border"
                        style={{
                          color: "var(--color-ink-2)",
                          borderColor: "var(--color-rule)",
                          background: "var(--color-subtle)",
                        }}
                      >
                        {u.role ?? "user"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md"
                        style={
                          u.isBlocked
                            ? {
                                background: "var(--color-danger-soft)",
                                color: "var(--color-danger)",
                              }
                            : {
                                background: "#dcfce7",
                                color: "#15803d",
                              }
                        }
                      >
                        {u.isBlocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-[11.5px]"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/users/${u.id}`}
                          className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border text-[11.5px] font-semibold transition-colors hover:bg-[var(--color-subtle)]"
                          style={{
                            color: "var(--color-ink-2)",
                            borderColor: "var(--color-rule)",
                          }}
                        >
                          Details
                        </Link>
                        {u.isBlocked ? (
                          <button
                            type="button"
                            onClick={() => onUnblock(u)}
                            disabled={busy}
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border text-[11.5px] font-semibold transition-colors hover:bg-[var(--color-subtle)] disabled:opacity-50"
                            style={{
                              color: "var(--color-ink-2)",
                              borderColor: "var(--color-rule)",
                            }}
                          >
                            {busy ? "…" : "Unblock"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onBlock(u)}
                            disabled={busy}
                            className="inline-flex items-center justify-center h-7 px-2.5 rounded-md border text-[11.5px] font-semibold transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                            style={{
                              color: "var(--color-ink-2)",
                              borderColor: "var(--color-rule)",
                            }}
                          >
                            {busy ? "…" : "Block"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onKick(u)}
                          disabled={busy}
                          className="grid place-items-center w-7 h-7 rounded-md border transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                          style={{
                            color: "var(--color-ink-3)",
                            borderColor: "var(--color-rule)",
                          }}
                          aria-label="Delete and ban user"
                          title="Delete + Banlist"
                        >
                          {busy ? (
                            <span className="text-[11px]">…</span>
                          ) : (
                            <IconBan width={13} height={13} />
                          )}
                        </button>
                      </div>
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
