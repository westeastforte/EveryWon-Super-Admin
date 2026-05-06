"use client";

import { useState } from "react";
import { signIn, signOut, useAuth } from "../lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === "initializing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (status === "unauthenticated" || role !== "superAdmin") {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        await signIn(email, password);
        // onAuthStateChanged in useAuth will update status
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Sign-in failed.";
        setError(
          msg.includes("invalid-credential") || msg.includes("wrong-password")
            ? "Invalid email or password."
            : msg,
        );
      } finally {
        setLoading(false);
      }
    };

    const isWrongRole = status === "authenticated" && role !== "superAdmin";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Everywon Admin
          </h1>
          <p className="text-sm text-gray-500 mb-8">Sign in to continue</p>

          {isWrongRole && (
            <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              This account does not have super-admin access.{" "}
              <button
                onClick={() => signOut()}
                className="underline font-medium"
              >
                Sign out
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="admin@everywon.net"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
