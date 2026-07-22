# Language Tutor Agent — Frontend

Next.js web application for the Trilingual Language Tutor Agent. Supports English, Korean, and Japanese with NextAuth OAuth login, chat + structured exercises, and audio playback with speed control.

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
| **Login** | OAuth sign-in with Google or GitHub |
| **Language & Level Picker** | Choose language (English/한국어/日本語) and level (Beginner/Intermediate/Advanced). Shows existing sessions as "Continue" |
| **Chat Screen** | Primary interface — chat bubbles, typing indicator, audio playback with speed toggle, corrections highlighting |
| **Exercise Panel** | Structured exercises with prompt card, answer input, and submission feedback |

## Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| `LoginScreen` | `components/login-screen.tsx` | OAuth login with Google/GitHub buttons |
| `LanguagePicker` | `components/language-picker.tsx` | Language + level selection with "Continue" for existing sessions |
| `ChatScreen` | `components/chat-screen.tsx` | Main chat interface with chat/exercise mode toggle, error handling, and retry |
| `ChatBubble` | `components/chat-bubble.tsx` | User vs agent message rendering with correction highlights, markdown, and audio failure indicators |
| `ChatBubbleError` | `components/chat-bubble-error.tsx` | Inline error pill shown under failed messages with Retry/Dismiss |
| `AudioPlayButton` | `components/audio-play-button.tsx` | Audio playback with **speed toggle** (normal/slow) and failure-aware retry |
| `TypingIndicator` | `components/typing-indicator.tsx` | Animated "agent is typing" indicator |
| `ExercisePanel` | `components/exercise-panel.tsx` | Exercise prompt card + answer submission with inline error display |
| `ErrorBoundary` | `components/error-boundary.tsx` | React error boundary with friendly fallback and Reload button |
| `TopBar` | `components/top-bar.tsx` | Session info badge, language switch, user menu |
| `SessionSidebar` | `components/session-sidebar.tsx` | Session list with rename/delete (with error toasts) |

## Error Handling

The frontend provides layered error handling:

| Layer | Mechanism | User Experience |
|-------|-----------|-----------------|
| **Network / server errors** | `ApiError` classification (`lib/api.ts`) | Inline error pill with Retry/Dismiss; toasts for auth/timeout |
| **Audio playback failures** | `AudioPlayButton` with MediaError tracking | Retry icon for network/decode; permanent disabled for unsupported |
| **Audio synthesis failures** | Inline 🔇 hint next to the message bubble | Visible indicator instead of silent failure |
| **Sidebar operations** | Boolean return from `renameSession`/`deleteSession` + sonner toasts | Error toast; stays in editing/confirm mode for retry |
| **Exercise generation** | Local `error` state in `ExercisePanel` | Inline error banner with Dismiss |
| **React render errors** | `ErrorBoundary` mounted in `app/layout.tsx` | Friendly fallback with Reload button |
| **401 (expired token)** | Automatic token cache clear + redirect to `/login` | Toast notification before redirect |

### Toast notifications (sonner)

All user-facing toasts go through `lib/toast.ts` which wraps [sonner](https://sonner.emilkowal.ski/) with typed helpers (`toast.error`, `toast.success`, `toast.warning`, `toast.info`, `toast.promise`). The `<Toaster />` is mounted in `app/layout.tsx` with theme-aware styling.

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx            # Root layout with NextAuth provider + ErrorBoundary + Toaster
│   ├── page.tsx              # Main page — routes between login/picker/chat
│   ├── globals.css           # Global styles
│   └── api/auth/
│       ├── [...nextauth]/     # NextAuth route handler
│       └── token/             # JWT token endpoint for backend auth
├── components/
│   ├── audio-play-button.tsx  # Audio playback with speed toggle + failure retry
│   ├── chat-bubble-error.tsx  # Inline error pill for failed messages
│   ├── chat-bubble.tsx        # Message bubbles with corrections + audio failure hints
│   ├── chat-screen.tsx        # Main chat component with error handling
│   ├── error-boundary.tsx     # React error boundary
│   ├── exercise-panel.tsx     # Exercise mode component with inline errors
│   ├── language-picker.tsx    # Language + level picker
│   ├── login-screen.tsx       # OAuth login screen
│   ├── session-sidebar.tsx    # Session list with rename/delete + error toasts
│   ├── top-bar.tsx            # Top navigation bar
│   ├── typing-indicator.tsx   # Loading indicator
│   └── ui/
│       ├── button.tsx         # shadcn Button component
│       └── spinner.tsx        # Loading spinner
├── lib/
│   ├── api.ts                 # Backend API client with ApiError classification
│   ├── auth.ts                # NextAuth configuration
│   ├── auth-provider.tsx      # NextAuth session provider
│   ├── toast.ts               # Typed toast helpers (sonner wrapper)
│   ├── types.ts               # TypeScript types
│   ├── use-theme.ts           # Theme hook
│   └── utils.ts               # Utility functions (cn)
├── public/                    # Static assets (icons, placeholder images)
├── .env.local                 # Environment variables
├── next.config.mjs            # Next.js configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Auth | NextAuth v5 (OAuth — Google, GitHub) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Markdown | react-markdown (for agent message rendering) |
| Icons | lucide-react |
| Toasts | sonner |