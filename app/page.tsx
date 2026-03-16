"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Search, MapPin, Heart, Building2, Users,
  Warehouse, Landmark, HandHeart, UserCheck, FlaskConical, Home,
  MessageSquare, BarChart3, Lightbulb, TrendingUp, Leaf, ArrowRight,
} from "lucide-react";
import { SignInButton, SignUpButton, Show } from "@clerk/nextjs";
import type { UserRole } from "@/types/chat";

const ROLE_CARDS: { id: UserRole; label: string; desc: string; Icon: React.ElementType }[] = [
  { id: "food_bank_partner", label: "Food Bank Partner",    desc: "Optimize distribution and identify service gaps",    Icon: Warehouse    },
  { id: "government_policy", label: "Government / Policy",  desc: "Make data-informed decisions on food security",      Icon: Landmark     },
  { id: "donor",             label: "Potential Donor",      desc: "See where your contributions make the most impact",  Icon: HandHeart    },
  { id: "volunteer",         label: "Volunteer / Advocate", desc: "Find opportunities to help in your community",       Icon: UserCheck    },
  { id: "researcher",        label: "Researcher / Analyst", desc: "Access comprehensive food access datasets",          Icon: FlaskConical },
  { id: "community",         label: "Community Member",     desc: "Discover resources available near you",              Icon: Home         },
];

const CHIPS = [
  "Show me distribution gaps by zip code",
  "Which partners serve the most families?",
  "Where are food deserts in our region?",
  "Track monthly trends in food assistance",
  "Compare access across neighborhoods",
];

const STATS: { Icon: React.ElementType; value: string; label: string }[] = [
  { Icon: MapPin,    value: "14,000+", label: "Resources"             },
  { Icon: Heart,     value: "900K+",   label: "Families Helped"       },
  { Icon: Building2, value: "11",      label: "Cities"                },
  { Icon: Users,     value: "200+",    label: "Partner Organizations"  },
];

const STEPS: { Icon: React.ElementType; title: string; desc: string }[] = [
  { Icon: MessageSquare, title: "Ask a Question",        desc: "In plain language"    },
  { Icon: BarChart3,     title: "AI Runs the Analysis",  desc: "Across all datasets"  },
  { Icon: Lightbulb,     title: "Get Charts & Insights", desc: "Actionable and clear" },
];

export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("community");

  function go(text: string) {
    const q = text.trim();
    if (!q) return;
    router.push(`/sandbox?q=${encodeURIComponent(q)}&role=${selectedRole}`);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") go(query);
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-geist-sans, system-ui, sans-serif)", WebkitFontSmoothing: "antialiased" }}>

      {/* ── Navbar ── */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{ backgroundColor: "rgba(245,237,216,0.85)", borderColor: "rgba(220,208,180,0.6)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
          <div className="flex items-center gap-2">
            <Leaf size={20} style={{ color: "#3DBFAC" }} />
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: "#1E2D3D" }}>
              Lemon Tree <span className="font-normal" style={{ opacity: 0.55 }}>Insights</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Show when="signed-out">
              <SignInButton>
                <button
                  className="text-sm font-medium transition-opacity hover:opacity-50"
                  style={{ color: "#4A5E6D" }}
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:opacity-95 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
                >
                  Get Started <ArrowRight size={14} />
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:opacity-95 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
              >
                Dashboard <ArrowRight size={14} />
              </button>
            </Show>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden px-6 pb-28 pt-24 text-center"
        style={{ background: "linear-gradient(175deg, #FAF7EE 0%, #EEE1C0 100%)" }}
      >
        {/* faint radial glow behind headline */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: "800px", height: "500px",
            background: "radial-gradient(ellipse at center top, rgba(61,191,172,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Headline */}
        <h1
          className="relative mx-auto mb-6 max-w-3xl text-[68px] font-extrabold leading-[1.05] tracking-tight"
          style={{ color: "#1E2D3D" }}
        >
          Data that tells the
          <br />
          <span className="relative inline-block mt-1">
            <span style={{ color: "#3DBFAC" }}>whole story</span>
            <svg viewBox="0 0 360 12" fill="none" xmlns="http://www.w3.org/2000/svg"
              className="absolute -bottom-1 left-0 w-full" aria-hidden="true">
              <path d="M4 8 C70 2, 140 11, 180 6 C220 1, 290 11, 356 5"
                stroke="#E8A030" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
            </svg>
          </span>
        </h1>

        {/* Subtext */}
        <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed" style={{ color: "#5A6E7D", opacity: 0.9 }}>
          Ask questions about food access in plain language. Get answers powered by AI
          that connect resources, communities, and impact.
        </p>

        {/* Search bar */}
        <div
          className="mx-auto mb-5 flex max-w-xl items-center gap-3 rounded-2xl bg-white px-5 py-3.5 transition-shadow focus-within:shadow-xl"
          style={{
            boxShadow: "0 4px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06)",
            border: "1.5px solid rgba(61,191,172,0.2)",
          }}
        >
          <Search size={17} style={{ color: "#9EB0BA", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What are you trying to understand today?"
            className="flex-1 bg-transparent text-[15px] outline-none"
            style={{ color: "#1E2D3D" }}
          />
          {query.trim() && (
            <button
              onClick={() => go(query)}
              className="flex shrink-0 items-center gap-1 rounded-xl px-3.5 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #27A090 100%)" }}
            >
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {/* Chips */}
        <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => go(chip)}
              className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-all hover:shadow-sm hover:-translate-y-px active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(180,165,140,0.5)",
                color: "#3A5060",
                backdropFilter: "blur(6px)",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* ── Built for everyone ── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-[38px] font-bold leading-tight" style={{ color: "#1E2D3D" }}>
              Built for everyone in the food access ecosystem
            </h2>
            <p className="text-base" style={{ color: "#6A7E8D" }}>
              Whether you&apos;re on the ground or making policy decisions, our platform adapts to your needs
            </p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {ROLE_CARDS.map(({ id, label, desc, Icon }) => (
              <div
                key={id}
                className="rounded-2xl p-6 text-left"
                style={{
                  background: "linear-gradient(145deg, #F8F2E4 0%, #F2EAD4 100%)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: "linear-gradient(135deg, #DDF0EC 0%, #C8E8E2 100%)" }}
                >
                  <Icon size={20} style={{ color: "#3DBFAC" }} />
                </div>
                <p className="mb-1 text-[15px] font-bold" style={{ color: "#1E2D3D" }}>{label}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#6A7E8D" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        className="px-6 py-20"
        style={{ background: "linear-gradient(180deg, #EDE0C2 0%, #F5EDD8 100%)" }}
      >
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-[38px] font-bold leading-tight" style={{ color: "#1E2D3D" }}>
            Our Impact
          </h2>
          <p className="text-base" style={{ color: "#6A7E8D" }}>
            Connecting communities to food access across the nation
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-4 gap-6">
          {STATS.map(({ Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-2xl py-8 text-center"
              style={{
                background: "rgba(255,255,255,0.35)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "linear-gradient(135deg, #FEF3E2 0%, #FDEBD0 100%)" }}
              >
                <Icon size={20} style={{ color: "#D4861A" }} />
              </div>
              <p
                className="text-[42px] font-extrabold leading-none tracking-tight"
                style={{ color: "#C07A10" }}
              >
                {value}
              </p>
              <p className="text-[13px] font-medium" style={{ color: "#6A7E8D" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="mb-2 text-[38px] font-bold" style={{ color: "#1E2D3D" }}>How It Works</h2>
            <p className="text-base" style={{ color: "#6A7E8D" }}>From question to insight in seconds</p>
          </div>

          <div className="relative flex items-start justify-between gap-6">
            {/* gradient connector line */}
            <div
              className="absolute left-[calc(16.66%+40px)] right-[calc(16.66%+40px)] top-[38px] h-px"
              style={{ background: "linear-gradient(90deg, #3DBFAC 0%, #C8E8E2 50%, #3DBFAC 100%)", opacity: 0.4 }}
            />

            {STEPS.map(({ Icon, title, desc }, i) => (
              <div key={i} className="relative z-10 flex flex-1 flex-col items-center text-center">
                <div className="relative mb-6">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-md"
                    style={{
                      background: "linear-gradient(145deg, #3DBFAC 0%, #1E9688 100%)",
                      boxShadow: "0 8px 24px rgba(61,191,172,0.30)",
                    }}
                  >
                    <Icon size={32} color="white" strokeWidth={1.75} />
                  </div>
                  <div
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{
                      background: "linear-gradient(135deg, #F0A830 0%, #D4861A 100%)",
                      boxShadow: "0 2px 6px rgba(212,134,26,0.4)",
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
                <p className="mb-1.5 text-[15px] font-bold" style={{ color: "#1E2D3D" }}>{title}</p>
                <p className="text-[13px]" style={{ color: "#6A7E8D" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="relative overflow-hidden px-6 py-28 text-center"
        style={{ background: "linear-gradient(135deg, #3DBFAC 0%, #1A8E80 100%)" }}
      >
        {/* decorative radial glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "700px", height: "400px",
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-2xl">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-white"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <TrendingUp size={13} />
            Join 200+ Organizations
          </div>
          <h2 className="mb-5 text-[50px] font-extrabold leading-tight text-white">
            Ready to explore the data?
          </h2>
          <p className="mb-10 text-[17px] leading-relaxed" style={{ color: "rgba(255,255,255,0.78)" }}>
            Start asking questions and discover insights that drive real impact in your community.
          </p>
          <button
            onClick={() => router.push(`/sandbox?role=${selectedRole}`)}
            className="group inline-flex items-center gap-2 rounded-2xl bg-white px-10 py-4 text-base font-semibold transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ color: "#1A8E80", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
          >
            Get Started
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-5 text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
            No credit card required
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-8 text-center"
        style={{ background: "linear-gradient(180deg, #EEE2C4 0%, #F5EDD8 100%)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Leaf size={14} style={{ color: "#3DBFAC", opacity: 0.7 }} />
          <span className="text-xs font-medium" style={{ color: "#8A9AAA" }}>Lemon Tree Insights</span>
        </div>
        <p className="text-xs" style={{ color: "#9AAAB8" }}>Empowering food access through data.</p>
      </footer>
    </div>
  );
}
