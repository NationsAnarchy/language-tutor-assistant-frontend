# Frontend Spec: Trilingual Language Tutor Agent

Scope: Next.js web app, NextAuth login, chat + structured exercises, audio playback. This doc describes screens, components, and states only — see the main project spec for backend/API details.

> **Hosting note:** Frontend (Vercel) and backend (Fly.io/Railway) are on separate domains/origins. API calls from the frontend should use the full backend URL via `NEXT_PUBLIC_BACKEND_URL` (an env var set in Vercel), and the FastAPI backend must have CORS configured to allow the Vercel domain.

---

## Screens

### 1. Login Screen
- App name/logo, short tagline (e.g. "Practice English, Korean, and Japanese with an AI tutor")
- Single primary action: "Sign in with Google" (or GitHub) button — NextAuth OAuth
- No email/password fields, no sign-up form (OAuth only)
- Redirects to Language/Level Picker on success

### 2. Language & Level Picker (post-login home)
- Shown right after login, and reachable any time via a "Switch language" control from the Chat screen
- **Language selection**: 3 options, shown as cards or large buttons — English / Korean / Japanese (consider flag icons or native-script labels: English, 한국어, 日本語)
- **Level selection**: 3 options — Beginner / Intermediate / Advanced (shown after language is picked, or alongside it)
- If the user already has an existing session for the selected language, show it as "Continue [Language] (Level: X)" instead of starting fresh — this surfaces the multi-session-per-language model from the backend
- Primary action: "Start" / "Continue" → navigates to Chat screen

### 3. Chat Screen (primary screen — most time spent here)
- **Top bar**: current language + level (e.g. "Korean · Intermediate"), a "Switch language" link/icon back to the picker, user avatar/logout menu (from NextAuth session)
- **Message list**: standard chat bubble layout
  - User messages: right-aligned
  - Agent messages: left-aligned, each with a small **play audio** icon button next to it (see Audio Playback Component below)
  - Agent messages that contain corrections should visually distinguish the correction (e.g. a subtly highlighted inline segment or a small "correction" label) from the rest of the reply — this is a core value-prop of the app and shouldn't just blend into plain text
- **Input area**: text input + send button, standard chat input pattern. Placeholder text should hint at the target language (e.g. "Type in Korean...")
- **Secondary action**: a button/tab to switch into Exercise mode (see Screen 4) without leaving the current session
- Loading state: show a typing indicator while waiting for the agent's response (this may take a few seconds due to retrieval + generation + TTS)

### 4. Exercise Screen (or a mode/tab within Chat)
- Can be a distinct screen or a toggled panel within the Chat screen — designer's call, but functionally: exercises are just another kind of turn in the same conversation
- **Exercise prompt card**: shows the generated question (vocab or grammar), with a play-audio icon if applicable
- **Answer input**: text field for free-response answers (exercises are LLM-graded conversationally, not multiple choice — see backend spec)
- **Submit button**
- After submission: feedback appears as the next message in the flow (correct/incorrect + explanation) — same visual treatment as a normal agent chat message
- **"New exercise" button** to request another one

### 5. Session/Account Menu (small, accessible from top bar)
- Sign out
- (Optional, only if time allows) list of other language sessions to jump between

---

## Key Components

| Component | Notes |
|---|---|
| `LanguageCard` | Used in the picker — icon/flag, language name (native script), tap target |
| `LevelSelector` | 3-way toggle or button group — Beginner/Intermediate/Advanced |
| `ChatBubble` | Variants: user vs. agent; agent variant includes audio play icon + optional correction highlight |
| `AudioPlayButton` | Icon button, plays a returned audio clip. States: idle / loading / playing. **Week 2 addition:** small speed toggle (e.g. normal/slow, 2-way switch is enough — not a full scrubber) attached to the same component, wired to Gemini TTS's pacing mechanism on the backend. |
| `TypingIndicator` | Shown while waiting on agent response |
| `ExercisePromptCard` | Question text + audio icon + answer input + submit |
| `TopBar` | Current language/level display, switch-language link, user menu |

---

## States to Design For

- **Empty chat state** (new session, no messages yet) — should prompt the user to just start typing, maybe a sample opener suggestion
- **Loading state** (waiting for agent response — covers retrieval + generation + TTS latency, could be a couple seconds)
- **Audio loading vs. playing** (the play button needs a distinct "fetching audio" state vs "currently playing" state)
- **Error state** (backend/API failure — simple inline message, e.g. "Something went wrong, try again")
- **Returning user with existing session** (picker shows "Continue" instead of "Start")

---

## Explicitly Out of Scope for v1 (don't design these)

- Sign-up/email-password forms (OAuth only)
- Mid-conversation language switching UI (switching always goes through the picker)
- Voice picker / multiple voices per language
- Audio scrubber (still out of scope — just a speed toggle, not a full player)
- Multiple-choice exercise UI (answers are free-text only)
- Mistake history / progress dashboard (not built this week — don't design it)
- Mobile app — this is a responsive web app, not a native app, though mobile-responsive layout is worth considering since Next.js/Vercel makes this fairly easy

---

## Tone/Style Notes (for the design tool, not enforced by code)

- This is a learning tool, not a game — keep it clean and calm rather than gamified (no streaks/badges/confetti for v1)
- Since 2 of the 3 languages use non-Latin scripts, make sure whatever font choice has solid Korean (Hangul) and Japanese (Kanji/Kana) glyph support
- Audio play icon should be small and unobtrusive — it's a supporting feature, not the visual focus of the chat
