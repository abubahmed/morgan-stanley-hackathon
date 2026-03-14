/**
 * lib/auth-helpers.ts
 * Server-side guards for API routes.
 *
 * Usage in an API route:
 *   import { requireAuth, requireAdmin } from "@/lib/auth-helpers";
 *
 *   export async function DELETE(req) {
 *     const session = await requireAdmin(req);
 *     // session.user.role === "admin" guaranteed here
 *   }
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type AppSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "client" | "admin";
  };
};

/**
 * Require any authenticated user.
 * Throws a 401 NextResponse if not signed in.
 */
export async function requireAuth(): Promise<AppSession> {
  const session = await auth() as AppSession | null;

  if (!session?.user) {
    throw NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  return session;
}

/**
 * Require an admin user.
 * Throws 401 if not signed in, 403 if signed in but not admin.
 */
export async function requireAdmin(): Promise<AppSession> {
  const session = await requireAuth();

  if (session.user.role !== "admin") {
    throw NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  return session;
}