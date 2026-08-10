# VIS Lab Tracker

Science department inventory tracker for equipment and consumables.

## Features

- Browse and search **Equipment** and **Consumables** separately
- Sign items out / return by SKU (authorised staff only)
- Stock take (HOD/Admin) and quick adjust when buying or something breaks
- Restock page + red highlighting when stock is below threshold
- Hide discontinued items; “no reorder” excludes restock alerts
- SDS / image / purchase link on the item detail page
- Temporary account switcher until Google Auth
- Mobile-friendly layout with bottom navigation

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

## Accounts (temporary)

Use **Choose account** / **Switch** in the header:

| Name | Notes |
|------|--------|
| Mark | Head of Department — can manage users |
| David | Admin — can manage users |
| Ethan, Nikki, Russell, Jonathan | Can sign out |

## Deploy (Supabase + Vercel)

1. Create a Supabase project.
2. In **Project Settings → Database**, copy:
   - **Transaction pooler** URL → `DATABASE_URL` (port `6543`, add `?pgbouncer=true`)
   - **Direct / Session** URL → `DIRECT_URL` (port `5432`)
3. Import the GitHub repo into Vercel and set environment variables:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `AUTH_SECRET` — any long random string
4. Deploy. The build runs `prisma migrate deploy` automatically.
5. Seed once from your machine (against Supabase):

```bash
# Point .env at Supabase, then:
npx prisma migrate deploy
npm run db:seed
```

## Stack

- Next.js (App Router)
- Prisma + PostgreSQL (Supabase)
- Tailwind CSS
- Cookie session (account switcher for now)
