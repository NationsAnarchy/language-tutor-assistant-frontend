# Language Tutor Agent — Frontend

Next.js web application for the Trilingual Language Tutor Agent. Supports English, Korean, and Japanese with NextAuth OAuth login, chat + structured exercises, audio playback with seek/volume/speed controls, client-side session switching, and multi-tab enforcement.

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
AUTH_GOOGLE_SECRET=your-google-client-secret

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
| **Language & Level Picker** | Choose language (English/한국어/日本語) and level (Beginner/Intermediate/Advanced). Shows existing sessions as "Continue" with "Start a fresh session instead" option. Flags rendered via twemoji SVG for cross-platform consistency. All buttons disabled while sessions are loading |
| **Chat Screen** | Primary interface — chat bubbles with markdown rendering (including tables), typing indicator, audio playback with seek bar/volume/speed controls, correction highlighting, error retry |
| **Exercise Panel** | Structured exercises with prompt card (markdown), answer input, and submission feedback. Inline error display for generation failures |

## Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| `LoginScreen` | `components/auth/login-screen.tsx` | OAuth login guarded by `usePreventDoubleClick` |
| `LanguagePicker` | `components/language/language-picker.tsx` | Language + level selection with "Continue" for existing sessions, disabled while loading |
| `ChatScreen` | `components/chat/chat-screen.tsx` | Main chat interface with chat/exercise mode toggle, error handling, and retry |
| `ChatBubble` | `components/chat/chat-bubble.tsx` | Message rendering with correction highlights, table support (remark-gfm), and audio failure indicators. Audio controls stacked below text on mobile |
| `ChatBubbleError` | `components/chat/chat-bubble-error.tsx` | Inline error pill shown under failed messages with Retry/Dismiss |
| `AudioPlayButton` | `components/audio/audio-play-button.tsx` | Audio playback with pause/resume, seek bar, time display, volume slider, mute toggle, and speed toggle (normal/slow — applies immediately during playback) |
| `TypingIndicator` | `components/chat/typing-indicator.tsx` | Animated "agent is typing" indicator using shared `TutorAvatar` |
| `ExercisePanel` | `components/chat/exercise-panel.tsx` | Exercise prompt card (with markdown table support) + answer submission + inline error display |
| `ErrorBoundary` | `components/ui/error-boundary.tsx` | React error boundary with friendly fallback and Reload button |
| `TopBar` | `components/layout/top-bar.tsx` | Session info badge, language switch, sidebar hamburger (mobile), user menu with mobile-accessible controls (theme toggle, language switch) |
| `SessionSidebar` | `components/layout/session-sidebar.tsx` | Session list with rename/delete + error toasts. Slides over content on mobile, persistent on desktop |
| `SessionItem` | `components/layout/session-item.tsx` | Individual session row with inline rename, delete confirmation, and loading states |
| `TutorAvatar` | `components/ui/tutor-avatar.tsx` | Shared tutor avatar SVG used by both `ChatBubble` and `TypingIndicator` |
| `CorrectionText` | `components/chat/correction-text.tsx` | Inline correction rendering (strikethrough original + corrected form) |
| `MultiTabOverlay` | `components/ui/multi-tab-overlay.tsx` | Full-screen overlay when multiple tabs detected — blocks app content until user elects one tab to continue |
| `LinguaLogo` | `components/auth/lingua-logo.tsx` | SVG logo component used on login and language picker screens |

## Hooks

| Hook | Location | Description |
|------|----------|-------------|
| `useAudioPlayer` | `lib/hooks/use-audio-player.ts` | Audio element lifecycle, play/pause/seek/volume/mute, event handlers, `AudioManager` integration. Used by `AudioPlayButton` |
| `useTheme` | `lib/hooks/use-theme.ts` | Dark/light mode with localStorage persistence and system preference detection |
| `usePreventDoubleClick` | `lib/hooks/use-prevent-double-click.ts` | Guards async callbacks against double-submission |
| `useMultiTabDetector` | `lib/hooks/use-multi-tab-detector.ts` | BroadcastChannel-based multi-tab detection (heartbeat protocol) |

## Utilities

| File | Description |
|------|-------------|
| `lib/api/index.ts` | Backend API client with `ApiError` classification, `sessionStorage` cache for sessions list, promise deduplication, and proxy-aware URL resolution |
| `lib/audio-manager.ts` | Global singleton tracking active audio elements; stops all on navigation, prevents tab close while playing |
| `lib/auth/index.ts` | NextAuth configuration with Google/GitHub providers |
| `lib/auth/auth-provider.tsx` | NextAuth session provider |
| `lib/providers/tab-detector-provider.tsx` | App provider that renders `MultiTabOverlay` when duplicate tab is detected |
| `lib/toast.ts` | Typed toast helpers wrapping sonner |
| `lib/types.ts` | TypeScript types for messages, languages, levels, audio state |
| `lib/twemoji.ts` | Maps flag emojis to twemoji CDN SVG URLs for consistent cross-platform rendering |
| `lib/utils.ts` | Utility functions (cn class merging) |

## Architecture

### Session Switching (Client-Side)

Conversation switching uses client-side state updates instead of full page navigation:

- Clicking a session in the sidebar calls `switchToSession()` which fetches data via `getSession()` and updates React state directly
- Browser history is managed via `window.history.pushState()` — back/forward buttons navigate through previous sessions
- The component stays mounted, the sidebar remains responsive, and no full-page re-render occurs
- A guard prevents double-clicks from triggering parallel switches
- While the new session data loads, a **subtle animated loading bar** appears at the top of the screen (2px tall, primary color, sliding animation) — the current conversation stays fully visible
- Sidebar interactions are disabled during the switch to prevent race conditions

### Caching Strategy

The sessions list is cached in two layers:

1. **In-memory cache** (30s TTL) — instant access during the same page session
2. **`sessionStorage`** — survives page navigation (e.g. going from `/chat` to `/language` and back)

The in-memory cache for individual session data (chat history) enables instant switch-back to previously visited conversations.

### API Proxy (CORS)

On Vercel, all API calls go through a same-origin proxy at `/api/proxy/[...path]`:

```
Browser → /api/proxy/session → Railway backend
          /api/proxy/chat
          /api/proxy/audio/...
          /api/proxy/session/{id}/tts
```

The proxy handles both response types:
- **JSON endpoints** (`/session`, `/chat`, `/sessions`) → proxied as text with `application/json`
- **Binary endpoints** (`/audio/...`, `/session/{id}/tts` POST) → proxied as `ArrayBuffer` preserving content-type and content-length

The `resolveURL()` function in `lib/api/index.ts` decides the target:
- **Locally** (`localhost`) → direct backend URL
- **On Vercel** → proxy path (`/api/proxy/...`)

### Audio Pipeline

```
Frontend → POST /session/{id}/tts → Backend (Gemini TTS)
  → Raw WAV bytes in response body
  → Blob URL (URL.createObjectURL)
  → Audio element (AudioPlayButton)
    → Play/Pause with seek bar, time display, volume slider, mute, speed control
```

Audio is no longer saved to disk on the backend. Instead, the TTS endpoint returns raw WAV bytes directly in the HTTP response body. The `synthesizeAudio()` function in `lib/api/index.ts` creates a blob URL (`URL.createObjectURL(audioBlob)`) that the `AudioPlayButton` component plays with `HTMLAudioElement`. This eliminates disk I/O, removes the ffmpeg dependency, and reduces playback latency (no intermediate file fetch).

The `useAudioPlayer` hook manages all audio lifecycle (creation, event listeners, cleanup). The `AudioManager` singleton tracks all active audio instances globally:
- **Navigation stops audio**: `audioManager.stopAll()` is called before switching conversations, navigating to language page, or signing out
- **Tab close protection**: When audio is playing, a `beforeunload` handler prevents accidental tab closure

### Multi-Tab Detection

Uses a **heartbeat protocol** over the `BroadcastChannel` API (Chrome 54+, Firefox 38+, Safari 15.4+):

- Every tab broadcasts its unique ID every 800ms
- Each tab maintains a `Set<string>` of all active IDs it has heard from
- If no heartbeat from an ID within 2500ms, it's automatically removed (handles tab crashes gracefully)
- When ≥1 other tab is detected, a full-screen overlay blocks the app content
- User clicks **"Use this tab"** to elect the current tab as the active one
- The elected tab dismisses the overlay; other tabs stay blocked and ask the user to close them

This is more reliable than a simple counter — it correctly handles 3+ tabs, rapid open/close, and tab crashes without getting stuck.

### Chat → TTS Flow

The frontend separates text and audio into two sequential requests (Issue #13):

1. `POST /chat` → returns text reply immediately (no waiting for TTS)
2. `POST /session/{id}/tts` → returns raw WAV bytes that the frontend plays as a blob URL (Issue #43)

This means the user sees the tutor's text response instantly, while audio is synthesized and played asynchronously. A loading spinner (🔇) appears next to the message while audio is being generated, and failure hints are shown inline if TTS fails.

### Error Handling

| Layer | Mechanism | User Experience |
|-------|-----------|-----------------|
| **Network / server errors** | `ApiError` classification (`lib/api/index.ts`) | Inline error pill with Retry/Dismiss; toasts for auth/timeout |
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
│
├── components/
│   ├── audio/
│   │   └── audio-play-button.tsx   # Audio playback with full controls
│   ├── auth/
│   │   ├── lingua-logo.tsx         # SVG logo
│   │   └── login-screen.tsx        # OAuth login
│   ├── chat/
│   │   ├── chat-bubble-error.tsx   # Inline error pill
│   │   ├── chat-bubble.tsx         # Message bubbles with tables + corrections
│   │   ├── chat-screen.tsx         # Main chat component
│   │   ├── correction-text.tsx     # Inline correction rendering
│   │   ├── exercise-panel.tsx      # Exercise mode
│   │   └── typing-indicator.tsx    # Loading indicator
│   ├── language/
│   │   └── language-picker.tsx     # Language + level picker
│   ├── layout/
│   │   ├── session-item.tsx        # Session row (rename/delete)
│   │   ├── session-sidebar.tsx     # Session list sidebar
│   │   └── top-bar.tsx             # Top navigation bar
│   └── ui/
│       ├── button.tsx              # shadcn Button
│       ├── error-boundary.tsx      # React error boundary
│       ├── markdown-config.tsx     # Shared markdown component overrides
│       ├── multi-tab-overlay.tsx   # Duplicate tab overlay
│       ├── spinner.tsx             # Loading spinner
│       └── tutor-avatar.tsx        # Shared tutor avatar
│
├── lib/
│   ├── api/
│   │   └── index.ts               # Backend API client
│   ├── auth/
│   │   ├── index.ts               # NextAuth configuration
│   │   └── auth-provider.tsx      # Session provider
│   ├── hooks/
│   │   ├── use-audio-player.ts     # Audio lifecycle hook
│   │   ├── use-multi-tab-detector.ts # Multi-tab detection hook
│   │   ├── use-prevent-double-click.ts # Double-click prevention hook
│   │   └── use-theme.ts           # Theme hook
│   ├── providers/
│   │   └── tab-detector-provider.tsx # Multi-tab detection provider
│   ├── audio-manager.ts           # Global audio singleton
│   ├── toast.ts                   # Typed toast helpers
│   ├── twemoji.ts                 # Flag emoji → twemoji SVG
│   ├── types.ts                   # TypeScript types
│   └── utils.ts                   # Utility functions (cn)
│
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