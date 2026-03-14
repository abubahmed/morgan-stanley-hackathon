This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Insights data layer (Lemontree + public datasets)

The app exposes a **layered insights API** so an agent or UI can get Lemontree metrics and public context (e.g. NYC food insecurity) in one consistent shape.

- **Ingest public data:** `npm run ingest-public` (writes to `data/public/`). For Census and BLS, set `CENSUS_API_KEY` and `BLS_API_KEY` in `.env.local` (see `.env.example`).
- **API:** `GET /api/insights?city=nyc&year=2025&limit=20` — merged areas with `lemontree` and `public` fields.  
  `GET /api/public-datasets` lists sources; `POST /api/public-datasets` refreshes the cache.
- **Testing:** See [docs/TESTING.md](docs/TESTING.md) for step-by-step checks.
- **Agent contract:** See [docs/agent-api.md](docs/agent-api.md) for query params and response shape.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
