"use client";

import { ChatScreen } from "@/components/chat/chat-screen";
import { SessionSidebar } from "@/components/layout/session-sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  ApiError,
  audioUrl,
  clearTokenCache,
  clearSessionCaches,
  getSession,
  langFromBackend,
  listSessions,
  refreshSessionInBackground,
} from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import type { Language, Level, Message, Session } from "@/lib/types";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function ChatPageInner() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");

  const [language, setLanguage] = useState<Language>("korean");
  const [level, setLevel] = useState<Level>("intermediate");
  const [sessionId, setSessionId] = useState<string | null>(sessionIdParam);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [switchingSession, setSwitchingSession] = useState(false);
  const switchingRef = useRef(false);

  // Load session data and all user sessions
  const loadData = useCallback(async () => {
    if (!sessionIdParam) {
      router.replace("/language");
      return;
    }

    // If switchToSession is already handling this, skip — it fetches the
    // same data and updates state directly. Prevents a double fetch when
    // pushState causes useSearchParams to re-evaluate (Issue #45 duplicate).
    if (switchingRef.current) {
      return;
    }

    try {
      const [sessionData, sessionsList] = await Promise.all([
        getSession(sessionIdParam),
        listSessions(),
      ]);

      const history: Message[] = (sessionData.chat_history || []).map(
        (msg, i) => ({
          id: `history-${i}`,
          role: msg.role === "user" ? ("user" as const) : ("agent" as const),
          content: msg.content,
          audioUrl: audioUrl(msg.audio_url ?? null) || undefined,
          timestamp: new Date(),
        }),
      );

      setInitialMessages(history);
      setLanguage(langFromBackend(sessionData.language) as Language);
      setLevel(sessionData.level as Level);
      setSessionId(sessionIdParam);

      setSessions(
        sessionsList.map((s) => ({
          language: langFromBackend(s.language) as Language,
          level: s.level as Level,
          exists: true,
          session_id: s.session_id,
          title: (s as any).title as string | undefined,
          updated_at: (s as any).updated_at as string | undefined,
        })),
      );

      // Background refresh — update the cache with fresh data for next time
      refreshSessionInBackground(sessionIdParam).catch(() => {});
    } catch (err) {
      // Only redirect on a true 404 — session doesn't exist
      if (err instanceof ApiError && err.status === 404) {
        router.replace("/language");
        return;
      }
      // 401 (stale token), network errors, or other transient failures:
      // don't boot the user out — the pageshow handler or forceReady
      // timeout will retry once the session is revalidated. (Issue #36)
    } finally {
      setLoading(false);
      // Session load complete — hide the switching indicator (Issue #44)
      setSwitchingSession(false);
      switchingRef.current = false;
    }
  }, [sessionIdParam, router]);

  // Load data immediately on mount — don't wait for auth rehydration (Issue #36)
  // The API calls are independently authenticated; if the session expired, loadData
  // will throw and the catch handler redirects to /language.
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Detect BFCache restore (tab close/reopen) and rehydrate the page (Issue #36)
  // When a page is restored from the back-forward cache, React effects don't
  // re-fire, but the component was frozen with stale session state. We need
  // three things: 1) force NextAuth to re-validate the session (updateSession),
  // 2) clear the stale JWT token cache so the backend gets a fresh token,
  // 3) reload backend data (loadData), 4) reset loading state.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(true);
        // Clear stale JWT cache — the backend may reject the cached token
        // after a BFCache restore, and we want a fresh one from /api/auth/token
        clearTokenCache();
        // Force NextAuth to re-fetch /api/auth/session, unfreezing its state,
        // then reload backend data once the session is confirmed valid.
        updateSession().then(() => loadData());
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [loadData, updateSession]);

  // Safety timeout: if either NextAuth status or loadData() hangs
  // (e.g. after BFCache restore or slow backend), force-unblock the
  // spinner after 5 seconds. (Issue #36)
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), 5_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Reload sessions list when returning from creating a new session
  const refreshSessions = useCallback(async () => {
    try {
      const sessionsList = await listSessions();
      setSessions(
        sessionsList.map((s) => ({
          language: langFromBackend(s.language) as Language,
          level: s.level as Level,
          exists: true,
          session_id: s.session_id,
          title: (s as any).title as string | undefined,
          updated_at: (s as any).updated_at as string | undefined,
        })),
      );
    } catch {
      // silently fail
    }
  }, []);

  /** Ref to skip pushState when handling a popstate event (back/forward). */
  const isPopStateRef = useRef(false);

  /** Client-side session switch — avoids full page re-mount (Issue #45).
   *  Uses pushState so browser back/forward navigates through sessions. */
  const switchToSession = useCallback(async (targetSessionId: string, fromPopState = false) => {
    setSwitchingSession(true);
    switchingRef.current = true;

    try {
      // Fetch session data (may return cached data for ~30s)
      const sessionData = await getSession(targetSessionId);
      const history: Message[] = (sessionData.chat_history || []).map(
        (msg, i) => ({
          id: `history-${i}`,
          role: msg.role === "user" ? ("user" as const) : ("agent" as const),
          content: msg.content,
          audioUrl: audioUrl(msg.audio_url ?? null) || undefined,
          timestamp: new Date(),
        }),
      );

      // Update all state at once — ChatScreen re-renders with new data
      setInitialMessages(history);
      setLanguage(langFromBackend(sessionData.language) as Language);
      setLevel(sessionData.level as Level);
      setSessionId(targetSessionId);

      // Push a new history entry so back/forward works between sessions.
      // Skip pushState when this is a popstate-triggered switch (back/forward).
      if (!fromPopState) {
        window.history.pushState({ sessionId: targetSessionId }, '', `/chat?session=${targetSessionId}`);
      }

      // Background refresh
      refreshSessionInBackground(targetSessionId).catch(() => {});
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        router.replace("/language");
      }
    } finally {
      setSwitchingSession(false);
      switchingRef.current = false;
    }
  }, [router]);

  /** Handle browser back/forward — reload data for the session from history state. */
  const handlePopState = useCallback((event: PopStateEvent) => {
    const state = event.state as { sessionId?: string } | null;
    // Cancel any in-flight agent request
    audioManager.stopAll();
    if (state?.sessionId) {
      switchToSession(state.sessionId, true);
    } else {
      // No state means we navigated back to before the first pushState
      // which is the initial page load — reload from URL params
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('session');
      if (sid) {
        switchToSession(sid, true);
      } else {
        router.push('/language');
      }
    }
  }, [router, switchToSession]);

  // Listen for back/forward navigation
  useEffect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handlePopState]);

  const handleSelectSession = (selectedSessionId: string) => {
    if (selectedSessionId === sessionId || switchingRef.current) return;
    // Stop any playing audio before switching conversations (Issue #42)
    audioManager.stopAll();
    switchToSession(selectedSessionId, false);
  };

  const handleNewSession = () => {
    // Stop any playing audio before navigating away (Issue #42)
    audioManager.stopAll();
    clearSessionCaches();
    router.push("/language");
  };

  const handleSwitchLanguage = () => {
    // Stop any playing audio before navigating away (Issue #42)
    audioManager.stopAll();
    router.push("/language");
  };

  const handleSignOut = () => {
    // Stop any playing audio before signing out (Issue #42)
    audioManager.stopAll();
    signOut({ callbackUrl: "/login" });
  };

  const handleActiveSessionDeleted = async () => {
    // Stop any playing audio before navigating (Issue #42)
    audioManager.stopAll();
    // Refresh sessions to get updated list without the deleted one (Issue #33)
    try {
      const sessionsList = await listSessions();
      const updated = sessionsList.map((s) => ({
        language: langFromBackend(s.language) as Language,
        level: s.level as Level,
        exists: true,
        session_id: s.session_id,
        title: (s as any).title as string | undefined,
        updated_at: (s as any).updated_at as string | undefined,
      }));
      setSessions(updated);
      // Navigate to latest remaining session, or picker if none
      const sorted = updated
        .filter((s) => s.session_id)
        .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      if (sorted.length > 0 && sorted[0].session_id) {
        router.push(`/chat?session=${sorted[0].session_id}`);
      } else {
        router.push("/language");
      }
    } catch {
      router.push("/");
    }
  };

  // Show full-page spinner only on initial load (not during session switches)
  if (!forceReady && (status === "loading" || loading)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Spinner size="lg" label="Loading..." />
      </main>
    );
  }

  // If forceReady expired but NextAuth hasn't resolved yet, show a fallback
  // instead of a blank white page. (Issue #36 — timing race on cold tab start)
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Spinner size="lg" label="Reconnecting..." />
        <p className="text-sm text-muted-foreground">
          Hang tight — reconnecting to your session…
        </p>
      </main>
    );
  }

  const user = {
    name: session.user?.name || "User",
    email: session.user?.email || "",
    image: session.user?.image || undefined,
  };

  return (
    <div className="fixed inset-0 flex bg-background">
      {/* Subtle loading bar at the very top during session switches (Issue #44) */}
      {switchingSession && (
        <div className="fixed top-0 left-0 right-0 z-100 h-0.5 bg-primary/20 overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full animate-loading-bar" />
        </div>
      )}

      <SessionSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onSignOut={handleSignOut}
        onSessionsChanged={refreshSessions}
        onActiveSessionDeleted={handleActiveSessionDeleted}
        user={user}
        disabled={isAgentLoading || switchingSession}
      />
      <div className="flex-1 min-w-0">
        <ChatScreen
          user={user}
          language={language}
          level={level}
          sessionId={sessionId}
          initialMessages={initialMessages}
          onSwitchLanguage={handleSwitchLanguage}
          onSignOut={handleSignOut}
          onLoadingChange={setIsAgentLoading}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-background">
          <Spinner size="lg" label="Loading..." />
        </main>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}