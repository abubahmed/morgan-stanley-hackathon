import Link from "next/link";

const suggestionChips = [
  "Show me distribution gaps by zip code",
  "Which partners serve the most families?",
  "Where are food deserts in our region?",
  "Track monthly trends in food assistance",
  "Compare access across neighborhoods",
];

const audienceCards = [
  {
    icon: <BuildingIcon />,
    title: "Food Bank Partner",
    description: "Optimize distribution and identify service gaps",
    highlighted: false,
  },
  {
    icon: <GovIcon />,
    title: "Government / Policy",
    description: "Make data-informed decisions on food security",
    highlighted: true,
  },
  {
    icon: <HeartIcon />,
    title: "Potential Donor",
    description: "See where your contributions make the most impact",
    highlighted: false,
  },
  {
    icon: <PeopleIcon />,
    title: "Volunteer / Advocate",
    description: "Find opportunities to help in your community",
    highlighted: false,
  },
  {
    icon: <FlaskIcon />,
    title: "Researcher / Analyst",
    description: "Access comprehensive food access datasets",
    highlighted: false,
  },
  {
    icon: <HomeIcon />,
    title: "Community Member",
    description: "Discover resources available near you",
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <main style={{ backgroundColor: "#FAF7F0" }}>
      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
          style={{ backgroundColor: "#e8f7f4", color: "#2ea890", border: "1px solid #c5ede7" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M17 8C8 10 5.9 16.17 3.82 19.34C3.45 19.9 4.14 20.5 4.67 20.1C7.5 17.9 9.5 16 12 16C14.5 16 16 17.5 16 17.5C20 15 22 10 21 6C19 4 14.5 5 12 7C10 8.5 9 11 9 11C9 11 11 8 17 8Z" fill="#3DBFA6"/>
          </svg>
          AI-Powered Food Access Intelligence
        </div>

        <h1 className="text-5xl font-bold leading-tight mb-4" style={{ color: "#1a1a2e" }}>
          Data that tells the
        </h1>
        <h1 className="text-5xl font-bold leading-tight mb-6 relative inline-block" style={{ color: "#3DBFA6" }}>
          whole story
          <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 200 6" preserveAspectRatio="none">
            <path d="M0 3 Q50 0 100 3 Q150 6 200 3" stroke="#F5A623" strokeWidth="2.5" fill="none"/>
          </svg>
        </h1>

        <p className="text-lg mt-8 mb-10 max-w-xl mx-auto" style={{ color: "#6b7280" }}>
          Ask questions about food access in plain language. Get answers powered by AI that connect resources, communities, and impact.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-xl mx-auto mb-5">
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white shadow-sm"
            style={{ border: "1px solid #e5e0d5" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: "#9ca3af", flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" stroke="#9ca3af" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="What are you trying to understand today?"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "#1a1a2e" }}
            />
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              className="px-4 py-2 rounded-full text-sm transition-colors cursor-pointer"
              style={{
                backgroundColor: "#f5f0e8",
                color: "#4b5563",
                border: "1px solid #e5e0d5",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-2" style={{ color: "#1a1a2e" }}>How It Works</h2>
        <p className="text-base mb-14" style={{ color: "#6b7280" }}>From question to insight in seconds</p>

        <div className="grid grid-cols-3 gap-8">
          {[
            {
              icon: <ChatIcon />,
              title: "Ask a Question",
              subtitle: "In plain language",
            },
            {
              icon: <ChartBarIcon />,
              title: "AI Runs the Analysis",
              subtitle: "Across all datasets",
            },
            {
              icon: <LightbulbIcon />,
              title: "Get Charts & Insights",
              subtitle: "Actionable and clear",
            },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: "#3DBFA6" }}>
                  {step.icon}
                </div>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-xs flex items-center justify-center"
                  style={{ backgroundColor: "#F5A623" }}/>
              </div>
              <div className="w-full h-px mt-2" style={{ backgroundColor: "#e5e0d5" }} />
              <div>
                <p className="font-semibold text-base" style={{ color: "#1a1a2e" }}>{step.title}</p>
                <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{step.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Built for Everyone */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-3" style={{ color: "#1a1a2e" }}>
          Built for everyone in the food access ecosystem
        </h2>
        <p className="text-base mb-12 max-w-xl mx-auto" style={{ color: "#6b7280" }}>
          Whether you&apos;re on the ground or making policy decisions, our platform adapts to your needs
        </p>

        <div className="grid grid-cols-3 gap-4">
          {audienceCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl p-6 text-left transition-all cursor-pointer hover:shadow-md"
              style={{
                backgroundColor: card.highlighted ? "#e8f7f4" : "#ffffff",
                border: card.highlighted ? "2px solid #3DBFA6" : "1px solid #e5e0d5",
              }}
            >
              <div className="mb-3" style={{ color: "#3DBFA6" }}>{card.icon}</div>
              <h3 className="font-semibold text-base mb-1" style={{ color: "#1a1a2e" }}>{card.title}</h3>
              <p className="text-sm" style={{ color: "#6b7280" }}>{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-24 text-center" style={{ backgroundColor: "#3DBFA6" }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M17 8C8 10 5.9 16.17 3.82 19.34C3.45 19.9 4.14 20.5 4.67 20.1C7.5 17.9 9.5 16 12 16C14.5 16 16 17.5 16 17.5C20 15 22 10 21 6C19 4 14.5 5 12 7C10 8.5 9 11 9 11C9 11 11 8 17 8Z" fill="white"/>
            </svg>
            Explore the Platform
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to explore the data?</h2>
          <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.85)" }}>
            Start asking questions and discover insights that drive real impact in your community.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-medium text-base transition-colors"
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "2px solid white",
            }}
          >
            View Dashboard →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-sm" style={{ color: "#9ca3af" }}>
        Empowering food access through data.
      </footer>
    </main>
  );
}

/* ── Icons ─────────────────────────────────────────────── */

function ChatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="12" width="4" height="9" rx="1" fill="white" opacity="0.7"/>
      <rect x="10" y="7" width="4" height="14" rx="1" fill="white"/>
      <rect x="17" y="3" width="4" height="18" rx="1" fill="white" opacity="0.7"/>
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H15M12 3C8.68629 3 6 5.68629 6 9C6 11.2208 7.2066 13.1599 9 14.1973V17H15V14.1973C16.7934 13.1599 18 11.2208 18 9C18 5.68629 15.3137 3 12 3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="#3DBFA6" strokeWidth="2"/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="#3DBFA6" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="#3DBFA6" strokeWidth="2"/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="#3DBFA6" strokeWidth="2"/>
    </svg>
  );
}

function GovIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 21V9M21 21V9M12 3L3 9H21L12 3Z" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="7" y="13" width="2" height="8" rx="0.5" fill="#3DBFA6"/>
      <rect x="11" y="13" width="2" height="8" rx="0.5" fill="#3DBFA6"/>
      <rect x="15" y="13" width="2" height="8" rx="0.5" fill="#3DBFA6"/>
      <line x1="3" y1="21" x2="21" y2="21" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="7" r="4" stroke="#3DBFA6" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M9 3H15M9 3V10L4.5 18C4.17 18.56 4.53 19.27 5.17 19.27H18.83C19.47 19.27 19.83 18.56 19.5 18L15 10V3M9 3H15" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9.5" cy="15.5" r="0.8" fill="#3DBFA6"/>
      <circle cx="13" cy="17" r="0.8" fill="#3DBFA6"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="#3DBFA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
