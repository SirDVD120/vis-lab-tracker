# VIS Lab Tracker

Science department inventory tracker for equipment and consumables.

## Features

- Browse and search **Equipment** and **Consumables** separately
- Sign items out / return by SKU (authorised staff only)
- Stock take (HOD/Admin) and quick adjust when buying or something breaks
- Restock page + red highlighting when stock is below threshold
- Hide discontinued items; “no reorder” excludes restock alerts
- SDS / image / purchase link on the item detail page
- Google sign-in with HOD approval (school or personal accounts)
- Mobile-friendly layout with bottom navigation + barcode scan

## Quick start (local)

Postgres should be running locally (Homebrew `postgresql@17` works).

```bash
cp .env.example .env
# Edit DATABASE_URL / DIRECT_URL if needed

npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Accounts

Sign in with **Google** (school or personal). New users enter their name and wait for **HOD approval**.

See [docs/GOOGLE_AUTH.md](docs/GOOGLE_AUTH.md) for Google Cloud OAuth setup.

## Deploy (Neon + Vercel)

1. Create a [Neon](https://console.neon.tech) project and copy connection strings from **Connect**:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (same host without `-pooler`) → `DIRECT_URL`
2. Set up Google OAuth (see [docs/GOOGLE_AUTH.md](docs/GOOGLE_AUTH.md))
3. Import the GitHub repo into Vercel and set environment variables:
   - `DATABASE_URL`, `DIRECT_URL`
   - `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - `HOD_BOOTSTRAP_EMAILS` — your email(s) for the first HOD
4. Deploy. The build runs `prisma migrate deploy` automatically.
5. Seed inventory once if needed:

```bash
npx prisma migrate deploy
npm run db:seed
```

## Stack

- Next.js (App Router)
- Prisma + PostgreSQL (Neon)
- Tailwind CSS
- Cookie sessions via Auth.js (Google)
