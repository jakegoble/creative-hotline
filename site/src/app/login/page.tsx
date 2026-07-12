/**
 * /login — TCH internal sign-in.
 * Two-person tool: Google sign-in restricted to Jake + Megha's emails.
 * Brand: cream bg, upright serif headline, italics only on <em> keywords.
 */

import { Suspense } from "react";
import LoginCard from "./login-card";

export const metadata = {
  title: "Sign in — The Creative Hotline",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginCard />
    </Suspense>
  );
}
