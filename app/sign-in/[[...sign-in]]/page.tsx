"use client";

import { SignIn, SignOutButton, Show } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6"
      style={{ background: "linear-gradient(175deg, #FAF7EE 0%, #EEE1C0 100%)" }}
    >
      <SignIn />
      <Show when="signed-in">
        <SignOutButton>
          <button
            className="text-sm font-medium transition-opacity hover:opacity-60"
            style={{ color: "#5A6E7D" }}
          >
            Sign out
          </button>
        </SignOutButton>
      </Show>
    </div>
  );
}
