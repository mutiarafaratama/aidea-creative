# AideaCreative Studio Foto

A photography booking + e-commerce web application for AideaCreative Studio Foto in Pringsewu, Lampung.

## Architecture

- **Monorepo** managed with pnpm workspaces
- **Frontend**: React + Vite (port 5000) at `artifacts/aidea-creative`
- **Backend**: Express + TypeScript (port 8080) at `artifacts/api-server`
- **Database**: Replit PostgreSQL via Drizzle ORM at `lib/db`
- **API client**: Generated OpenAPI client at `lib/api-client-react`

## Tech Stack

- React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, framer-motion
- Express, Drizzle ORM, PostgreSQL
- JWT auth (bcrypt + jsonwebtoken), httpOnly cookies + localStorage token
- Midtrans payment gateway (sandbox)
- OpenAI integration for AI features

## Authentication

- **JWT-based** auth (replaced Supabase Auth during Replit migration)
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Logout: `POST /api/auth/logout`
- Current user: `GET /api/auth/me`
- Token stored in `localStorage["auth_token"]` and `auth_token` httpOnly cookie
- 30-day expiry, signed with `SESSION_SECRET`
- Users table: `users_auth` (email + passwordHash) linked to `profiles`
- Admin emails controlled via `ADMIN_EMAILS` env var (default: `tiarafaratama@gmail.com`)

## File Uploads

- **Local filesystem** (replaced Supabase Storage during Replit migration)
- Upload: `POST /api/upload/supabase` (admin only, accepts base64)
- Delete: `POST /api/upload/supabase/destroy`
- Files stored in `./uploads/` directory, served at `/uploads`

## Environment Variables (Replit Secrets)

- `DATABASE_URL` — PostgreSQL connection string (Replit DB)
- `SESSION_SECRET` — JWT signing secret
- `MIDTRANS_SERVER_KEY` — Midtrans payment server key
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL
- `ADMIN_EMAILS` — Comma-separated admin email list

## Running the App

```bash
# Start both services
pnpm install
# API Server (port 8080)
PORT=8080 pnpm --filter @workspace/api-server run dev
# Frontend (port 5000)
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/aidea-creative run dev
```

## Database Schema

Run `pnpm --filter @workspace/db run push` to apply schema changes to Replit PostgreSQL.

Key tables: `profiles`, `users_auth`, `paket_layanan`, `kategori_layanan`, `booking`, `pesanan_produk`, `item_pesanan`, `produk`, `portfolio`, `testimoni`, `pengaturan_situs`, `promo`, `chat_session`, `chat_history`, `chat_kb`, `jadwal_tersedia`
