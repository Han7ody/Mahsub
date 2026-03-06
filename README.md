# Mahsub App (محسوب)

A responsive website for Sudanese stores and merchants to manage debts, transactions, and collections digitally.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Font**: IBM Plex Sans Arabic
- **Icons**: Material Symbols Outlined
- **UI Components**: shadcn/ui (to be added as needed)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## GitHub Pages

This repo is configured to deploy a **static preview** to GitHub Pages using a GitHub Actions workflow.

- Workflow: [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)
- Static export mode is enabled when `GITHUB_PAGES=true` (adds `basePath`/`assetPrefix` and sets `output: 'export'`).

To enable Pages:

1. Go to **Settings → Pages**
2. Under **Build and deployment**, select **Source: GitHub Actions**
3. Push to `main` (or run the workflow manually)

Local test (PowerShell):

```powershell
$env:GITHUB_PAGES='true'
$env:NEXT_PUBLIC_USE_BACKEND='false'
npm run build
```

Note: GitHub Pages is static hosting, so backend routes (API/auth callbacks/middleware) are disabled in this deployment.

## Supabase (Link Backend)

This project already includes Supabase clients and data repositories under `lib/supabase/*` and `lib/repo/*`.

### Local development

1. Create/update `.env.local` (it is ignored by git):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_USE_BACKEND=true
```

2. Run:

```bash
npm run dev
```

### GitHub Pages deployment

1. In GitHub → **Settings → Secrets and variables → Actions**, add these repository secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. In Supabase Dashboard → **Authentication → URL Configuration**, add your site URLs:

- If using default Pages URL (repo basePath):
	- `https://<username>.github.io/<repo>`
	- Redirect URL: `https://<username>.github.io/<repo>/auth/callback`

- If using a custom domain at root:
	- `https://your-domain.com`
	- Redirect URL: `https://your-domain.com/auth/callback`

Notes:
- `NEXT_PUBLIC_*` values are embedded into the frontend bundle at build time (they are not secrets in the browser). This is normal for Supabase anon keys.
- For GitHub Pages static hosting, this repo generates Storage signed URLs directly from the browser (no Next.js API route required).

## Development Status

- Registration and login are currently disabled.
- The UI displays an "under development" notice site-wide.

## Project Structure

```
mahsub-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with RTL & Arabic font
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/
│   └── marketing/         # Marketing page components
│       ├── Header.tsx
│       ├── HeroSection.tsx
│       ├── StatsSection.tsx
│       ├── FeaturesSection.tsx
│       ├── HowItWorksSection.tsx
│       ├── CTASection.tsx
│       └── Footer.tsx
├── lib/                   # Utilities (to be added)
├── data/                  # Demo/mock data (to be added)
└── public/                # Static assets
```

## Features

- ✅ RTL Arabic layout
- ✅ Dark mode support
- ✅ Responsive design
- ✅ IBM Plex Sans Arabic font
- ✅ Material Symbols icons
- 🔄 shadcn/ui components (to be added as needed)

## Made with ❤️ in Khartoum 🇸🇩
