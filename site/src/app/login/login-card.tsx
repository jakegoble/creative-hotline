"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginCard() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/templates-v2/hub.html";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      if (res.ok) {
        const data = (await res.json()) as { next?: string };
        window.location.assign(data.next ?? next);
        return;
      }
      if (res.status === 429) {
        setError("Too many attempts. Wait a few minutes and try again.");
      } else {
        setError("Wrong email or password. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    marginBottom: 14,
    border: "2px solid #1A1A1A",
    background: "#FFFDF7",
    fontSize: 15,
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    color: "#1A1A1A",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F5EFE3",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#FFFDF7",
          border: "2px solid #1A1A1A",
          boxShadow: "8px 8px 0 #1A1A1A",
          padding: "40px 36px",
          textAlign: "center",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#1A1A1A",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>☎️</div>
        <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 6px" }}>
          The Creative Hotline
        </h1>
        <p style={{ fontSize: 15, margin: "0 0 28px", opacity: 0.75 }}>
          Internal line. Pick up with your <em>work</em> email and password.
        </p>

        {error && (
          <p
            style={{
              fontSize: 14,
              margin: "0 0 20px",
              padding: "10px 14px",
              border: "2px solid #C0392B",
              color: "#C0392B",
              background: "#FDF2F0",
            }}
          >
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} style={{ textAlign: "left" }}>
          <input
            type="email"
            placeholder="you@work.email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "14px 28px",
              background: "#1A1A1A",
              color: "#F5EFE3",
              border: "none",
              cursor: busy ? "wait" : "pointer",
              fontSize: 15,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontWeight: 700,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ fontSize: 12, margin: "24px 0 0", opacity: 0.5 }}>
          Jake &amp; Megha only. Clients never need to sign in.
        </p>
      </div>
    </main>
  );
}
