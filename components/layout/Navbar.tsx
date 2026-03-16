"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, LayoutDashboard, Bot, Store, Star } from "lucide-react";
import { Show, SignOutButton } from "@clerk/nextjs";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/sandbox",   label: "Sandbox",   Icon: Bot             },
  { href: "/resources", label: "Resources", Icon: Store           },
  { href: "/reviews",   label: "Reviews",   Icon: Star            },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        backgroundColor: "rgba(245,237,216,0.88)",
        borderColor: "rgba(210,195,165,0.5)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-3">
        <Link href="/" className="flex items-center gap-2 group">
          <Leaf size={18} style={{ color: "#3DBFAC" }} />
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "#1E2D3D" }}>
            Lemon Tree <span className="font-normal" style={{ opacity: 0.55 }}>Insights</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {navLinks.map(({ href, label, Icon }) => {
            const isActive = href !== "#" && (pathname === href || pathname.startsWith(href + "/"));
            return (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all"
                style={isActive
                  ? { color: "#1E9080", backgroundColor: "rgba(61,191,172,0.12)" }
                  : { color: "#5A6E7D" }
                }
              >
                <Icon size={13} style={{ opacity: isActive ? 1 : 0.7 }} />
                {label}
              </Link>
            );
          })}
          <Show when="signed-in">
            <SignOutButton>
              <button
                className="ml-3 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all"
                style={{ color: "#5A6E7D" }}
              >
                Sign out
              </button>
            </SignOutButton>
          </Show>
        </div>

      </div>
    </nav>
  );
}
