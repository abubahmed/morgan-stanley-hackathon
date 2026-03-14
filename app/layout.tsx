"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/Navbar";
import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const NO_NAV = ["/login"];
 
function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav  = !NO_NAV.includes(pathname ?? "");
 
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {showNav && <NavBar />}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
 
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <LayoutInner>{children}</LayoutInner>
        </SessionProvider>
      </body>
    </html>
  );
}
