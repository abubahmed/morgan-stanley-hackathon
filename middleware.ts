import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED = ["/dashboard", "/reviews", "/sandbox", "/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect specific routes
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Check JWT — this does NOT touch the database
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/reviews/:path*", "/sandbox/:path*", "/admin/:path*"],
};