"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";

  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const result = await login(email.trim(), password);
        if (result.ok) {
          router.push(from);
          router.refresh();
        } else {
          setErrorMessage(result.error || "Failed to sign in");
        }
      } else {
        const result = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
        if (result.ok) {
          router.push(from);
          router.refresh();
        } else {
          setErrorMessage(result.error || "Registration failed");
        }
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 font-bold text-xl mb-3 border border-blue-500/30">
          TAM
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {mode === "login" ? "Sign In to TAM" : "Create Administrator Account"}
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          VPS Reseller Directory & WHMCS Management Platform
        </p>
      </div>

      {/* Tab Switch */}
      <div className="flex bg-neutral-900 p-1 rounded-xl mb-6 border border-neutral-800">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mode === "login"
              ? "bg-neutral-800 text-white shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setErrorMessage(null);
          }}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            mode === "register"
              ? "bg-neutral-800 text-white shadow-sm"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          First-Time Setup
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-start gap-2">
          <span className="text-red-400 font-bold">Error:</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Mode helper text */}
      {mode === "register" && (
        <div className="mb-5 p-3 rounded-xl bg-blue-950/50 border border-blue-800/50 text-blue-300 text-xs">
          <span className="font-semibold">Notice:</span> The first registered user is automatically designated as system <span className="font-bold underline">Admin</span>.
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daniyal Ahmed"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-300 mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            minLength={mode === "register" ? 8 : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {mode === "register" && (
            <p className="text-[11px] text-neutral-500 mt-1">
              Must be at least 8 characters long.
            </p>
          )}
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processing...
            </span>
          ) : mode === "login" ? (
            "Sign In"
          ) : (
            "Complete Setup & Sign In"
          )}
        </button>
      </form>

      {/* Security Footnote */}
      <div className="mt-6 pt-5 border-t border-neutral-800/80 text-center text-[11px] text-neutral-500">
        Protected by HttpOnly session tokens & multi-layer backend verification.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col justify-center items-center px-4 py-8">
      <Suspense
        fallback={
          <div className="text-neutral-400 text-sm">Loading security gate...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
