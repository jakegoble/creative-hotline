"use client";

import { useSearchParams } from "next/navigation";

const ERRORS: Record<string, string> = {
  not_allowed:
    "That Google account isn't on the line. Use jake@radanimal.co or megha@theanecdote.co.",
  state: "Sign-in session expired. Try again.",
  exchange: "Google sign-in failed mid-handshake. Try again.",
};

export default function LoginCard() {
  const params = useSearchParams();
  const error = params.get("error");
  const next = params.get("next") ?? "/templates-v2/hub.html";
  const loginHref = `/api/auth/login?next=${encodeURIComponent(next)}`;

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
          Internal line. Pick up with your <em>work</em> Google account.
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
            {ERRORS[error] ?? "Sign-in failed. Try again."}
          </p>
        )}

        <a
          href={loginHref}
          style={{
            display: "inline-block",
            padding: "14px 28px",
            background: "#1A1A1A",
            color: "#F5EFE3",
            textDecoration: "none",
            fontSize: 15,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily:
              "'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontWeight: 700,
          }}
        >
          Sign in with Google
        </a>

        <p style={{ fontSize: 12, margin: "24px 0 0", opacity: 0.5 }}>
          Jake &amp; Megha only. Clients never need to sign in.
        </p>
      </div>
    </main>
  );
}
