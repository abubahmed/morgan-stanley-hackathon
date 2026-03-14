"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ backgroundColor: "#FAF7F0", minHeight: "100vh" }}
      className="flex items-center justify-center px-4">
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#e8f7f4" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                  fill="#3DBFA6" opacity="0.2"/>
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="#3DBFA6"/>
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ color: "#1a1a2e" }}>Canopy</span>
          </div>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Food Access Intelligence Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8" style={{ border: "1px solid #e5e0d5" }}>
          <h1 className="text-xl font-bold mb-1" style={{ color: "#1a1a2e" }}>Sign in</h1>
          <p className="text-sm mb-6" style={{ color: "#6b7280" }}>
            Enter your credentials to access the platform.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: "1px solid #e5e0d5", background: "white",
                  color: "#374151", fontSize: 14, outline: "none",
                }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 10,
                  border: "1px solid #e5e0d5", background: "white",
                  color: "#374151", fontSize: 14, outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 10,
                background: loading ? "#9ca3af" : "#1a1a2e",
                color: "white", fontSize: 14, fontWeight: 600,
                border: "none", cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-4 rounded-xl text-xs" style={{ background: "#f0faf8", border: "1px solid #c5ede7" }}>
          <p className="font-medium mb-1" style={{ color: "#2ea890" }}>Demo credentials</p>
          <p style={{ color: "#374151" }}>Admin: jessica@canopy.dev / admin123</p>
          <p style={{ color: "#374151" }}>User:  maria@example.com / user123</p>
        </div>
      </div>
    </main>
  );
}