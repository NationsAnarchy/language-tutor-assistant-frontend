"use client";

import { ChatScreen } from "@/components/chat-screen";
import { SessionSidebar } from "@/components/session-sidebar";
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
import type { Language, Level, Message, Session } from "@/lib/types";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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

  // Load session data and all user sessions
  const loadData = useCallback(async () => {
    if (!sessionIdParam) {
      router.replace("/language");
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

  const handleSelectSession = (selectedSessionId: string) => {
    if (selectedSessionId === sessionId) return;
    router.push(`/chat?session=${selectedSessionId}`);
  };

  const handleNewSession = () => {
    clearSessionCaches();
    router.push("/language");
  };

  const handleSwitchLanguage = () => {
    router.push("/language");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const handleActiveSessionDeleted = async () => {
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
        disabled={isAgentLoading}
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
