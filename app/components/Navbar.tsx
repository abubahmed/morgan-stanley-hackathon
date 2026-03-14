"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/reviews", label: "Reviews" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{ backgroundColor: "#FAF7F0", borderBottom: "1px solid #e5e0d5" }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LeafIcon />
          <span className="font-semibold text-lg" style={{ color: "#1a1a2e" }}>
            Lemon Tree Insights
          </span>
        </Link>

        <div className="flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium transition-colors relative pb-1"
                style={{
                  color: isActive ? "#3DBFA6" : "#4b5563",
                  borderBottom: isActive ? "2px solid #3DBFA6" : "2px solid transparent",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function LeafIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M17 8C8 10 5.9 16.17 3.82 19.34C3.45 19.9 4.14 20.5 4.67 20.1C7.5 17.9 9.5 16 12 16C14.5 16 16 17.5 16 17.5C20 15 22 10 21 6C19 4 14.5 5 12 7C10 8.5 9 11 9 11C9 11 11 8 17 8Z"
        fill="#3DBFA6"
      />
    </svg>
  );
}
