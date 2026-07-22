# Language Tutor Agent — Frontend

Next.js web application for the Trilingual Language Tutor Agent. Supports English, Korean, and Japanese with NextAuth OAuth login, chat + structured exercises, audio playback with speed control, and multi-tab enforcement.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # edit with your keys

# 3. Start the development server
npm run dev
```

The app runs on `http://localhost:3000`.

> **Important:** The backend must be running separately on `http://localhost:8000` (see `../backend/README.md`).

## Environment Variables

Create a `.env.local` file:

```env
# NextAuth
AUTH_SECRET=your-secret
AUTH_URL=http://localhost:3000

# Google OAuth
AUTH_GOOGLE_ID=your-google-client-id
AUTH_GOOGLE_SECRET=your-google-secret

# GitHub OAuth (optional)
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Screens

| Screen | Description |
|--------|-------------|
| **Login** | OAuth sign-in with Google (or GitHub). Double-click prevention via `usePreventDoubleClick` hook |
| **Language & Level Picker** | Choose language (English/한국어/日本語) and level (Beginner/Intermediate/Advanced). Shows existing sessions as "Continue" with "Start a fresh session instead" option. Flags rendered via twemoji SVG for cross-platform consistency |
| **Chat Screen** | Primary interface — chat bubbles with markdown rendering (including tables), typing indicator, audio playback with speed toggle, correction highlighting, error retry |
| **Exercise Panel** | Structured exercises with prompt card (markdown), answer input, and submission feedback. Inline error display for generation failures |

## Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| `LoginScreen` | `components/login-screen.tsx` | OAuth login guarded by `usePreventDoubleClick` |
| `LanguagePicker` | `components/language-picker.tsx` | Language + level selection with "Continue" for existing sessions |
| `ChatScreen` | `components/chat-screen.tsx` | Main chat interface with chat/exercise mode toggle, error handling, and retry. Passes sidebar toggle to TopBar |
| `ChatBubble` | `components/chat-bubble.tsx` | Message rendering with correction highlights, **table support** (remark-gfm), and audio failure indicators |
| `ChatBubbleError` | `components/chat-bubble-error.tsx` | Inline error pill shown under failed messages with Retry/Dismiss |
| `AudioPlayButton` | `components/audio-play-button.tsx` | Audio playback with speed toggle (normal/slow) and failure-aware retry |
| `TypingIndicator` | `components/typing-indicator.tsx` | Animated "agent is typing" indicator |
| `ExercisePanel` | `components/exercise-panel.tsx` | Exercise prompt card (with markdown table support) + answer submission + inline error display |
| `ErrorBoundary` | `components/error-boundary.tsx` | React error boundary with friendly fallback and Reload button |
| `TopBar` | `components/top-bar.tsx` | Session info badge, language switch, **sidebar hamburger** (mobile), user menu with mobile-accessible controls (theme toggle, language switch) |
| `SessionSidebar` | `components/session-sidebar.tsx` | Session list with rename/delete + error toasts. Slides over content on mobile, persistent on desktop |
| `MultiTabOverlay` | `components/multi-tab-overlay.tsx` | Full-screen overlay when multiple tabs detected — blocks app content until user elects one tab to continue |

## Utilities

| File | Description |
|------|-------------|
| `lib/api.ts` | Backend API client with `ApiError` classification and proxy-aware URL resolution |
| `lib/use-prevent-double-click.ts` | Hook guarding async callbacks against double-submission |
| `lib/use-multi-tab-detector.ts` | BroadcastChannel-based multi-tab detection (no polling) |
| `lib/tab-detector-provider.tsx` | App provider that renders `MultiTabOverlay` when duplicate tab is detected |
| `lib/auth.ts` | NextAuth configuration with Google/GitHub providers |
| `lib/auth-provider.tsx` | NextAuth session provider |
| `lib/toast.ts` | Typed toast helpers wrapping sonner |
| `lib/types.ts` | TypeScript types for messages, languages, levels |
| `lib/twemoji.ts` | Maps flag emojis to twemoji CDN SVG URLs for consistent cross-platform rendering (fixes missing flags on stripped-down Windows / Linux builds) |
| `lib/use-theme.ts` | Dark/light mode theme hook |
| `lib/utils.ts` | Utility functions (cn class merging) |

## Architecture

### API Proxy (CORS)

On Vercel, all API calls go through a same-origin proxy at `/api/proxy/[...path]`:

```
Browser → /api/proxy/session → Railway backend
          /api/proxy/chat
          /api/proxy/audio/...
```

The proxy intelligently handles both response types:
- **JSON endpoints** (`/session`, `/chat`, `/sessions`, `/tts`) → proxied as text with `application/json`
- **Binary endpoints** (`/audio/...`) → proxied as `ArrayBuffer` preserving content-type and content-length

The `resolveURL()` function in `lib/api.ts` decides the target:
- **Locally** (`localhost`) → direct backend URL
- **On Vercel** → proxy path (`/api/proxy/...`)

### Audio Pipeline

```
Backend (Railway) → TTS generates MP3 → /audio/{path} → Frontend proxy → Browser audio element
                                                                       → AudioPlayButton (play/stop + speed toggle)
```

### Multi-Tab Detection

Uses a **heartbeat protocol** over the `BroadcastChannel` API (Chrome 54+, Firefox 38+, Safari 15.4+):

- Every tab broadcasts its unique ID every 800ms
- Each tab maintains a `Set<string>` of all active IDs it has heard from
- If no heartbeat from an ID within 2500ms, it's automatically removed (handles tab crashes gracefully)
- When ≥1 other tab is detected, a full-screen overlay blocks the app content
- User clicks **"Use this tab"** to elect the current tab as the active one
- The elected tab dismisses the overlay; other tabs stay blocked and ask the user to close them

This is more reliable than a simple counter — it correctly handles 3+ tabs, rapid open/close, and tab crashes without getting stuck.

### Error Handling

| Layer | Mechanism | User Experience |
|-------|-----------|-----------------|
| **Network / server errors** | `ApiError` classification (`lib/api.ts`) | Inline error pill with Retry/Dismiss; toasts for auth/timeout |
| **Audio playback failures** | `AudioPlayButton` with MediaError tracking | Retry icon for network/decode; permanent disabled for unsupported |
| **Audio synthesis failures** | Inline 🔇 hint next to the message bubble | Visible indicator instead of silent failure |
| **Sidebar operations** | Boolean return from `renameSession`/`deleteSession` + sonner toasts | Error toast; stays in editing/confirm mode for retry |
| **Exercise generation** | Local `error` state in `ExercisePanel` | Inline error banner with Dismiss |
| **React render errors** | `ErrorBoundary` mounted in `app/layout.tsx` | Friendly fallback with Reload button |
| **401 (expired token)** | Automatic token cache clear + redirect to `/login` | Toast notification before redirect |

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with NextAuth + TabDetectorProvider + Toaster
│   ├── page.tsx                # Main page — routes between login/picker/chat
│   ├── globals.css             # Global styles + theme tokens
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/   # NextAuth route handler
│       │   └── token/           # JWT token endpoint for backend auth
│       └── proxy/
│           └── [...path]/       # CORS proxy (JSON + binary support)
├── components/
│   ├── audio-play-button.tsx    # Audio playback with speed toggle + failure retry
│   ├── chat-bubble-error.tsx    # Inline error pill for failed messages
│   ├── chat-bubble.tsx          # Message bubbles with tables + corrections + audio hints
│   ├── chat-screen.tsx          # Main chat component with error handling
│   ├── error-boundary.tsx       # React error boundary
│   ├── exercise-panel.tsx       # Exercise mode with markdown tables + inline errors
│   ├── language-picker.tsx      # Language + level picker
│   ├── lingua-logo.tsx          # SVG logo component
│   ├── login-screen.tsx         # OAuth login with double-click protection
│   ├── multi-tab-overlay.tsx    # Full-screen overlay for duplicate tab detection
│   ├── session-sidebar.tsx      # Session list with rename/delete + error toasts
│   ├── top-bar.tsx              # Top bar with sidebar hamburger + mobile controls
│   ├── typing-indicator.tsx     # Loading indicator
│   └── ui/
│       ├── button.tsx           # shadcn Button component
│       └── spinner.tsx          # Loading spinner
├── lib/
│   ├── api.ts                   # Backend API client with proxy-aware URL resolution
│   ├── auth.ts                  # NextAuth configuration
│   ├── auth-provider.tsx        # NextAuth session provider
│   ├── tab-detector-provider.tsx # Multi-tab detection provider
│   ├── toast.ts                 # Typed toast helpers (sonner wrapper)
│   ├── twemoji.ts               # Flag emoji → twemoji SVG URL mapping (cross-platform rendering)
│   ├── types.ts                 # TypeScript types
│   ├── use-multi-tab-detector.ts # BroadcastChannel multi-tab hook
│   ├── use-prevent-double-click.ts # Double-click prevention hook
│   ├── use-theme.ts             # Theme hook
│   └── utils.ts                 # Utility functions (cn)
├── public/                      # Static assets (icons, placeholder images)
├── .env.example                 # Documented environment variables
├── next.config.mjs              # Next.js configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
├── vercel.json                  # Vercel deployment config
└── README.md                    # This file
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (OAuth — Google, GitHub) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Markdown | react-markdown + remark-gfm (table support) |
| Icons | lucide-react |
| Emoji Flags | twemoji (Twitter Emoji) SVG via CDN |
| Toasts | sonner |

## Deployment (Vercel)

The project includes `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "regions": ["iad1"]
}
```

Set these environment variables in the Vercel dashboard:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://your-backend.up.railway.app` |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `AUTH_URL` | `https://your-app.vercel.app` |
| `AUTH_GOOGLE_ID` | Your Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Your Google OAuth client secret |

> **Important:** Add `https://your-app.vercel.app/api/auth/callback/google` to your Google Cloud Console OAuth redirect URIs (keep `http://localhost:3000/api/auth/callback/google` for local dev).