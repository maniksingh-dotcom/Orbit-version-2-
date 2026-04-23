# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Orbit MVP — an internal CRM/intelligence platform for managing customer profiles, Fathom meeting notes, team collaboration, deal rooms, and document uploads. Multi-user app with Google OAuth authentication (Auth.js v5).

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx prisma migrate dev --name <name>   # Create and apply a migration
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma studio    # Open Prisma Studio to view/edit database
```

## Architecture

**Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + **Supabase PostgreSQL**, Auth.js v5, vanilla CSS (CSS Modules + global styles).

### Supabase Database (PRIMARY DATA STORE)
**IMPORTANT:** All application data is stored in Supabase PostgreSQL. This is the single source of truth for:
- User accounts, sessions, and authentication
- Customer profiles and business data
- Meeting notes, documents, and attachments
- Team collaboration (groups, messages, action items)
- Fathom OAuth tokens and email replies

### Prisma 7 + Supabase Setup (Important)
- **Database:** Supabase PostgreSQL (connection string in `.env` as `DATABASE_URL`)
- Schema at `prisma/schema.prisma` — datasource URL is NOT in the schema, it's in `prisma.config.ts`
- Client uses `@prisma/adapter-pg` driver adapter with `pg` package (Prisma 7 requirement for PostgreSQL)
- Singleton at `src/lib/prisma.ts` — import `prisma` from `@/lib/prisma`
- All migrations stored in `prisma/migrations/` and applied to Supabase
- **Migration Status:** 3 migrations currently applied:
  1. `0_init` — Initial schema with all Auth.js and business models
  2. `add_email_reply_tracking` — EmailReply model for Gmail integration
  3. `add_fathom_oauth_accounts` — FathomAccount model for OAuth tokens

### Authentication (Auth.js v5)
- Google OAuth provider configured in `src/app/api/auth/[...nextauth]/route.ts`
- Session management via Auth.js with database adapter
- Proxy pattern (Next.js 16) in `src/proxy.ts` — protects all routes except `/login` and `/api/auth/*`
- User roles: `admin`, `employee` (default)
- Role-based access control via `@/lib/authGuard` — use `requireRole()` in API routes

### Key Directories
- `src/app/` — Pages and API routes (App Router)
  - `/` — Dashboard (requires auth)
  - `/login` — Google OAuth login page (public)
  - `/customers` — Customer list and detail pages
  - `/team` — Team collaboration and deal rooms
  - `/tasks` — Action items and tasks management
  - `/api/*` — All backend API routes
- `src/components/` — Client components (NavBar, CustomerTabs, NotesTab, DocumentsTab, FileUpload, AudioPlayer, MeetingWidget, GmailWidget, DealRoomChat, etc.)
- `src/lib/` — Server utilities (prisma.ts, fathom.ts, gmail.ts, fileUtils.ts, openai.ts, authGuard.ts, supabase.ts)
- `src/contexts/` — React contexts (ToastContext)
- `src/hooks/` — Custom React hooks (useRole, etc.)
- `scripts/` — Utility scripts

### Data Flow
- **Server Components** (customer list, detail pages, team pages) query Prisma directly (connects to Supabase) — no API call needed
- **Client Components** use `fetch()` to hit API routes under `src/app/api/`
- **Authentication**: All routes protected by proxy.ts except `/login` and `/api/auth/*`
- **Database Queries**: All Prisma queries execute on Supabase PostgreSQL via `@/lib/prisma` singleton
- **File Storage**: Supabase Storage bucket for all uploads (documents, team notes, customer files)
  - Customer documents: `POST /api/upload` → Supabase Storage bucket
  - Team note attachments: `POST /api/team-notes/upload` → Supabase Storage bucket
  - Files served via `GET /api/files/[...path]` from Supabase Storage
  - File paths stored in Supabase PostgreSQL (Document and TeamNoteAttachment models)

### Fathom Integration (Meeting Intelligence with OAuth)
- **OAuth Authentication**: Users connect their own Fathom accounts via OAuth 2.0
- API client helper in `src/lib/fathom.ts` — supports both OAuth tokens and API key fallback
- **User Settings**: `/settings` page allows users to connect/disconnect Fathom accounts
- **Token Management**: Automatic token refresh when expired, stored in `FathomAccount` model
- Sync endpoint: `GET /api/fathom?customerId=xxx` — pulls meetings using user's OAuth token
- Webhook endpoint: `POST /api/fathom/webhook` — receives new meeting events (uses API key fallback)
- Upcoming meeting: `GET /api/fathom/upcoming` — returns next upcoming + last completed meeting
- OAuth callback: `GET /api/fathom/callback` — handles OAuth authorization code exchange
- Disconnect: `POST /api/fathom/disconnect` — removes user's Fathom connection
- Meeting notes automatically formatted with markdown (headings, summaries, action items)
- Notes display with ReactMarkdown for proper formatting
- Each employee sees their own Fathom meetings through their authenticated account

### Gmail Integration (Customer Emails)
- OAuth integration via Google Cloud Console (requires Gmail API scope)
- API client helper in `src/lib/gmail.ts`
- Fetch customer emails: `GET /api/gmail` — fetches emails from customers (last 90 days)
- Send reply: `POST /api/gmail/reply` — sends reply and saves to database
- Reply tracking: EmailReply model stores all sent replies with message ID linking
- UI shows "✓ Replied" badge and displays reply history when expanding emails
- Auto-refresh after sending reply to show updated status

### AI Assistant (OpenAI Integration)
- AI helper in `src/lib/openai.ts` using GPT-4o-mini
- Actions: summarize, insights, suggest_actions, rephrase, draft_reply
- Used in notes, emails, and team collaboration
- Requires `OPENAI_API_KEY` in `.env`
- Error handling for quota/API issues

### Styling Conventions
- Dark theme with glassmorphism (CSS variables in `globals.css`)
- Global utility classes: `.glass-card`, `.btn .btn-primary`, `.btn-outline`, `.badge`, `.form-input`, `.form-textarea`, `.tab-bar .tab`, `.notes-table`, `.meeting-widget`
- Page-specific styles use CSS Modules (`*.module.css`)
- Fonts: Outfit (headings), Inter (body)
- Colors: `--accent-primary: #6366f1` (indigo), `--accent-secondary: #8b5cf6` (violet)

### Database Models

**Auth Models (Auth.js v5 required):**
- **User** — id, name, email, image, role (admin/employee), emailVerified
- **Account** — OAuth accounts (Google), access_token, refresh_token, expires_at
- **Session** — sessionToken, userId, expires
- **VerificationToken** — identifier, token, expires

**Business Models:**
- **Customer** — name, age, customerType (individual/company), companyName, country, state, email, phone, website, logoUrl, description, mandate fields (scope, compensation, exclusivity, legal protections, transaction definition), linked to User (owner)
- **Note** — title, content, source ("fathom" | "manual"), addedBy, fathomId (unique for Fathom sync), linked to Customer and User
- **Document** — title, filePath, fileType (txt/pdf/docx/image/audio), mimeType, transcription (nullable for audio), uploadedBy, linked to Customer
- **TeamNote** — content, userId, customerId, dealRoomId, meetingId, source (manual/fathom), attachments (TeamNoteAttachment[])
- **TeamNoteAttachment** — filePath, fileName, fileType, mimeType, linked to TeamNote
- **ActionItem** — title, completed, status (todo/in_progress/done), assigneeId, dueDate, priority (low/medium/high), linked to User, Customer, DealRoom, meetingId
- **DealRoom** — name, description, customers (many-to-many via DealRoomCustomer), messages, teamNotes, actionItems
- **DealRoomCustomer** — junction table for DealRoom ↔ Customer many-to-many
- **DealRoomMessage** — content, dealRoomId, userId, createdAt (for deal room chat)
- **Notification** — type, message, link, read, userId, fromId
- **MeetingSummary** — fathomId, title, date, duration, attendeeCount, attendees, summary, actionItems, recordingUrl
- **EmailReply** — emailThreadId, emailMessageId, to, subject, body, userId, createdAt (tracks sent email replies)
- **FathomAccount** — userId, accessToken, refreshToken, expiresAt, scope, tokenType (stores user's Fathom OAuth credentials)

### Environment Variables (.env)

Required environment variables:
```bash
# Database
DATABASE_URL="postgresql://..."  # Supabase PostgreSQL connection string

# Auth.js (Google OAuth)
AUTH_SECRET="..."                 # Generate with: openssl rand -base64 32
AUTH_GOOGLE_ID="..."             # From Google Cloud Console
AUTH_GOOGLE_SECRET="..."         # From Google Cloud Console
NEXTAUTH_URL="http://localhost:3000"  # Your app URL

# Fathom API (Legacy - used as fallback)
FATHOM_API_KEY="..."             # From Fathom app settings (optional, fallback for webhooks)
FATHOM_WEBHOOK_SECRET="..."      # For webhook verification and OAuth client secret

# Fathom OAuth (Primary authentication method)
FATHOM_OAUTH_CLIENT_ID="..."     # From Fathom OAuth app settings
FATHOM_OAUTH_REDIRECT_URI="..."  # OAuth callback URL (https://yourdomain.com/api/fathom/callback)

# OpenAI
OPENAI_API_KEY="..."             # From OpenAI platform

# Supabase (optional, for direct Supabase features)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

### Important Notes

**Supabase as Single Source of Truth:**
- **ALL DATA** lives in Supabase PostgreSQL - no local database files
- Connection string in `.env` as `DATABASE_URL` points to Supabase
- All Prisma operations (queries, mutations) execute on Supabase
- File uploads stored in Supabase Storage (accessed via `@/lib/fileUtils`)
- Never use SQLite or local databases - Supabase only
- Prisma Studio connects to Supabase for database inspection

**Proxy Pattern (Next.js 16):**
- Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`
- The proxy function in `src/proxy.ts` handles authentication checks
- All routes are protected except `/login` and `/api/auth/*`
- Cookie-based session checking via Auth.js session tokens

**Markdown Rendering:**
- Fathom notes are stored with markdown formatting (##, ###, bullet points)
- Use ReactMarkdown component to render them properly in the UI
- Manual notes display as plain text with `whiteSpace: 'pre-wrap'`

**File Storage (Supabase Storage):**
- All files stored in Supabase Storage bucket (cloud storage)
- Customer documents: Uploaded via `POST /api/upload`, stored in Supabase Storage
- Team note attachments: Uploaded via `POST /api/team-notes/upload`, stored in Supabase Storage
- File paths stored in Supabase PostgreSQL (Document and TeamNoteAttachment models)
- Files served via `GET /api/files/[...path]` from Supabase Storage
- Uses `@/lib/fileUtils` helper functions (uploadToStorage, downloadFromStorage, deleteFromStorage)

**Role-Based Access:**
- Use `@/lib/authGuard` with `requireRole()` in all API routes
- Roles: `admin` > `employee`
- All employees have full access to create, edit, and delete customers, notes, documents, deal rooms, and action items
- Only admins can access `/admin/users` for user management
- Frontend uses `useRole()` hook for conditional UI rendering
- Example: `const { canDo, isAdmin } = useRole(); if (isAdmin) { ... }`

**Database Migrations (Supabase):**
- Always use Prisma migrations: `npx prisma migrate dev --name <name>`
- Migrations are applied directly to Supabase PostgreSQL
- Never modify the Supabase database schema directly (always use Prisma)
- Migration files stored in `prisma/migrations/`
- Run `npx prisma generate` after schema changes to update Prisma Client
- Current migrations applied: `0_init`, `add_email_reply_tracking`, `add_fathom_oauth_accounts`
