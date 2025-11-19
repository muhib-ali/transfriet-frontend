// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Logged in successfully");
      router.push("/dashboard"); // unified path
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1  lg:grid-cols-2 bg-white dark:bg-neutral-900">
      {/* Left panel (logo + intro) */}
      <div className="hidden lg:flex flex-col justify-center px-16 ">
     <img src="transfreit-logo.svg" alt="" />
      </div>

      {/* Right panel (form) */}
      <div className="flex items-center justify-center py-12 px-6 lg:px-16">
        <div className="w-full max-w-md">
          <h2 className="text-4xl font-semibold text-gray-900 mb-8 dark:text-white">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white">
                <span className="text-red-500 mr-1">*</span>Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                {/* left icon (decorative) */}
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  {/* Mail icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white">
                <span className="text-red-500 mr-1">*</span>Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 pr-10 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                {/* left icon (decorative) */}
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  {/* Lock icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </span>
                {/* right eye toggle button */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-6 10-6c2.2 0 4.1.6 5.6 1.4M22 12s-3.5 6-10 6c-2.2 0-4.1-.6-5.6-1.4" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" stroke="currentColor" strokeWidth="1.6" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Row: Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="inline-flex  items-center gap-2 text-sm dark:text-white text-gray-700">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-teal-600  focus:ring-teal-500"
                />
                Remember Me
              </label>

              <a href="#" className="text-sm text-teal-700 hover:underline">
                Forgot Password
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 py-2.5 text-white text-base font-medium hover:bg-blue-700 cursor-pointer disabled:opacity-60 transition"
            >
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
