# AlumNet

Alumni network platform for connecting school graduates by career field, education, location, and shared interests. Single-school deployment.

## Tech Stack

- **Frontend**: Next.js (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage)
- **Email**: Resend
- **Deployment**: Vercel + Supabase

## Prerequisites

- [Node.js 20](https://nodejs.org/) (LTS — see `.nvmrc`)
- [pnpm](https://pnpm.io/) (package manager)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (local development)
- [Docker](https://www.docker.com/) (required by Supabase CLI)

## Getting Started

```bash
# 1. Clone the repo
git clone <repo-url> && cd alumni-network

# 2. Use correct Node version
nvm use

# 3. Install dependencies
pnpm install

# 4. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase and Resend keys

# 5. Start Supabase locally
supabase start

# 6. Run database migrations
supabase db reset

# 7. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
alumni-network/
├── src/
│   └── app/              # Next.js App Router pages
│       ├── (auth)/       # Auth routes (login, signup)
│       ├── (main)/       # Authenticated routes
│       └── (admin)/      # Admin dashboard
├── supabase/
│   ├── migrations/       # Database migrations
│   └── seed.sql          # Seed data
├── docs/
│   ├── adrs/             # Architecture Decision Records
│   └── features/         # Feature implementation notes
├── SPEC.md               # Product specification
├── CLAUDE.md             # Development rules & conventions
└── .env.example          # Required environment variables
```

## Documentation

- **[SPEC.md](./SPEC.md)** — Full product specification, feature log, and data model
- **[CLAUDE.md](./CLAUDE.md)** — Development rules, code style, and workflow conventions
- **[docs/adrs/](./docs/adrs/)** — Architecture Decision Records
- **[docs/features/](./docs/features/)** — Feature implementation notes

## Development Workflow

This project follows a layered development process (L1–L7). See [CLAUDE.md](./CLAUDE.md) for details.

## License

Private — all rights reserved.
