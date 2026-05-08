# AideaCreative Studio Foto

A photography booking + e-commerce web application for AideaCreative Studio Foto in Pringsewu, Lampung.

## Architecture

- **Monorepo** managed with pnpm workspaces
- **Frontend**: React + Vite (port 5000) at `artifacts/aidea-creative`
- **Backend**: Express + TypeScript (port 8099) at `artifacts/api-server`
- **Dev Proxy**: Forwards port 3000 → 5000 (external preview) at `scripts/dev-proxy.mjs`
- **Database**: Supabase PostgreSQL via Drizzle ORM at `lib/db` (uses `SUPABASE_DATABASE_URL` secret)
- **API client**: Generated OpenAPI client at `lib/api-client-react`
- **API spec**: OpenAPI YAML + Orval codegen at `lib/api-spec`

## Tech Stack

- React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui, Radix UI, framer-motion
- Express 5, Drizzle ORM, PostgreSQL (Replit built-in)
- JWT auth (bcrypt + jsonwebtoken), httpOnly cookies + localStorage token
- Midtrans payment gateway (sandbox)
- OpenAI-compatible AI integration for chatbot and product description generation
- Google OAuth (redirect-based, no Supabase)
- Local filesystem file uploads (base64 → disk, served at /uploads)

## Workflows

- **API Server**: Builds then runs Express on port 8099
- **Frontend**: Vite dev server on port 5000 (proxies /api → 8099)
- **Dev Proxy 3000**: Exposes port 3000 → 5000 (external preview via Replit)

## Authentication

- **JWT-based** custom auth (no Supabase Auth)
- Register: `POST /api/auth/register`
- Login: `POST /api/auth/login`
- Logout: `POST /api/auth/logout`
- Current user: `GET /api/auth/me`
- Google OAuth: `GET /api/auth/google` → callback → `/auth/callback?token=...`
- Token stored in `localStorage["auth_token"]` and `auth_token` httpOnly cookie
- 30-day expiry, signed with `SESSION_SECRET`
- Users table: `users_auth` (email + passwordHash) linked to `profiles`
- Admin emails controlled via `ADMIN_EMAILS` env var (default: `tiarafaratama@gmail.com`)

## File Uploads

- **Local filesystem** uploads (replaces Supabase Storage)
- Upload (admin): `POST /api/upload/supabase` (admin only, accepts base64 payload)
- Upload (user avatars): `POST /api/upload/avatar` (any authenticated user, saves to avatars/ bucket)
- Delete: `POST /api/upload/supabase/destroy`
- Files stored in `UPLOAD_DIR` (default: `./uploads/`), served at `/uploads`

## Environment Variables

Set in Replit Secrets or Shared env vars:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Replit PostgreSQL connection string (auto-set) |
| `SESSION_SECRET` | JWT signing secret |
| `MIDTRANS_SERVER_KEY` | Midtrans payment server key |
| `VITE_MIDTRANS_CLIENT_KEY` | Midtrans client key (shared env var) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI/compatible API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL |
| `AI_MODEL` | AI model name (default: qwen-turbo, shared env var) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Comma-separated admin email list |
| `UPLOAD_DIR` | Upload directory path (shared env var) |

## Database Schema

All tables live in the Replit PostgreSQL instance. Schema is defined in `lib/db/src/schema/`.

Key tables:
- `profiles` — user profile data (name, phone, address, avatar, role)
- `users_auth` — authentication records (email, password hash, OAuth provider)
- `paket_layanan` — photography packages
- `kategori_layanan` — package categories
- `booking` — photo session bookings
- `pesanan_produk` — product orders (e-commerce)
- `item_pesanan` — order line items
- `produk` — products for sale (prints, frames, albums, etc.)
- `portfolio` — portfolio gallery items
- `testimoni` — customer testimonials
- `pengaturan_situs` — site settings (key/value store)
- `promo` — promotions/banners
- `chat_session` — AI/admin chat sessions
- `chat_history` — chat message history
- `chat_kb` — knowledge base entries for AI chatbot
- `jadwal_tersedia` — available schedule slots

Run schema migrations: `pnpm --filter @workspace/db run push`

## Booking Payment Flow

Booking status flow: `menunggu → dikonfirmasi → selesai`

- After user submits booking, status is `menunggu`
- Admin must confirm (`dikonfirmasi`) before user can pay
- Payment button (`Bayar Sekarang`) only appears in user Profil when `status === "dikonfirmasi"`
- Info message shown when `status === "menunggu"` explaining payment awaits admin confirmation
- Backend guards: `POST /api/booking/:id/payment` returns 400 if status is not `dikonfirmasi`

## Realtime Polling

- Admin booking/pesanan pages poll every 7–8s with toast on status change
- User profil page polls every 7–8s with toast on booking AND pesanan status change
- Home page testimoni refetches every 60s with staleTime:0 to pick up new approvals

## Photobooth Virtual

- `artifacts/aidea-creative/src/pages/photobooth.tsx` — virtual photobooth in browser
- 3 frame themes: **Aidea Blue** (rect clip, blue gradient), **Love Edition** (oval clip, pink hearts), **Night Sky** (gold stars, dark gradient)
- Per-photo retake: hover/tap thumbnail shows RotateCcw button to retake only that shot
- Touch drag: emojis draggable on mobile via Pointer Events (`onPointerDown/Move/Up`)
- Larger logo watermark (40px font) scattered in side margins for Frame 1

## AI Chatbot / Draggable Buttons

- `artifacts/aidea-creative/src/components/ai-chatbot.tsx` — floating chatbot button
- Fully draggable on mobile/desktop via Pointer Events API; position persists in `localStorage["aidea_ai_btn_pos"]`
- Click vs. drag discrimination (moves <5px = click)
- On Paket page: `MobilAiButton` component with "Asisten AI" label above icon; saves to `localStorage["aidea_paket_ai_btn_pos"]`

## PWA

- `vite-plugin-pwa` installed, Service Worker enabled in dev mode (`devOptions: { enabled: true, type: "module" }`)
- Install prompt component at `artifacts/aidea-creative/src/components/install-prompt.tsx`
- Manifest: `/public/manifest.webmanifest` (auto-generated)
- Icons: `pwa-192.png`, `pwa-512.png`

## Docker / GitHub Deployment

- `Dockerfile` — multi-stage build: builds frontend (Vite), builds API (esbuild), serves API on port 8080
- `docker-compose.yml` — single-service config with env vars
- API server serves built frontend static files in production
