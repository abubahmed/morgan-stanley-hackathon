"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "#", label: "Reports" },
  { href: "#", label: "Help" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between bg-lt-green-700 px-6 py-3 shadow-md">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-2xl">🌿</span>
        <span className="text-lg font-semibold text-white tracking-tight">
          Lemon Tree <span className="font-light opacity-80">Insights</span>
        </span>
      </Link>

      <div className="flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={label}
              href={href}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
