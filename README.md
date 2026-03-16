# Food Access Intelligence Platform

An AI-powered data analysis platform for exploring food access, public health, and socioeconomic data across the United States. Built for the Morgan Stanley hackathon.

Users ask natural language questions and an AI agent writes and executes Python code in a sandboxed environment, producing charts, statistical analysis, and exportable PDF reports — all in real time with live progress streaming.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **AI:** Anthropic Claude (Sonnet for chat routing, Opus for analysis agent)
- **Code Execution:** E2B sandboxed Python environment (pandas, matplotlib, seaborn, scipy)
- **Database:** MongoDB (conversations, users, reports, image storage)
- **Auth:** Clerk
- **Mapping:** Mapbox GL
- **Charts:** Recharts (frontend), matplotlib/seaborn (server-side)
- **Styling:** Tailwind CSS 4
- **PDF Export:** jsPDF

## Architecture

```
User question
  -> Claude Sonnet (chat router) decides if analysis is needed
    -> Claude Opus (analysis agent) in agentic loop (up to 25 iterations)
      -> Writes & executes Python in E2B sandbox
      -> Collects charts as images, saves to MongoDB
      -> Returns analysis text + image URLs
    -> Streams progress tokens to frontend in real time
  -> Results displayed in split-pane UI with exportable reports
```

## Datasets

All datasets are pre-loaded as pandas DataFrames in the sandbox:

| Dataset | Source | Description |
|---------|--------|-------------|
| `resources`, `shifts`, `occurrences`, `tags`, `flags` | Lemontree | Food pantries, soup kitchens, SNAP/EBT locations with schedules and metadata |
| `census_demographics`, `census_poverty`, `census_income`, `census_housing`, `census_education`, `census_commute`, `census_geography` | US Census ACS | County-level socioeconomic data (2014-2023) |
| `usda_food_env` | USDA Food Environment Atlas | Food deserts, grocery/convenience store density, SNAP participation |
| `cdc_health` | CDC PLACES | County-level health indicators (obesity, diabetes, depression, etc.) |
| `zip_county` | Crosswalk | ZIP code to county FIPS mapping |
| `reviews` | Generated | 3,000 community reviews of food resources |

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- API keys for Anthropic, E2B, Clerk, and Mapbox

### Environment Variables

Create a `.env.local` file:

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# E2B Sandbox
E2B_API_KEY=e2b_...

# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB=morgan_stanley

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Main chat endpoint with SSE streaming |
| `/api/conversations` | GET, POST, PUT, DELETE | Conversation CRUD |
| `/api/conversations/[id]` | GET | Full conversation with messages |
| `/api/images/[id]` | GET | Serve generated chart images from MongoDB |
| `/api/user/sync` | POST | Sync Clerk user to MongoDB |
| `/api/resources` | GET | Food resource data |
| `/api/map-data` | GET | Geospatial data for Mapbox |
| `/api/insights` | GET | Aggregated data insights |
| `/api/public-datasets` | GET | Available dataset metadata |
| `/api/reviews` | GET | Review data |

## Project Structure

```
app/                  # Next.js App Router pages & API routes
components/           # React components
  dashboard/          # Dashboard views (charts, maps, header)
  layout/             # Navbar, layout wrappers
  sandbox/            # Chat UI (thread, input, messages, visualization panel)
data/                 # CSV datasets (census, USDA, CDC, resources, reviews)
lib/                  # Utilities
  db/                 # MongoDB collection helpers (conversations, users, images, reports)
sandbox/              # AI agent (agent.ts, tools, system prompt, schema docs)
types/                # TypeScript type definitions
```
