"use client";

import { ChatScreen } from "@/components/chat/chat-screen";
import { SessionSidebar } from "@/components/layout/session-sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  clearSessionCaches,
} from "@/lib/api";
import { audioManager } from "@/lib/audio-manager";
import { useChatSessionNavigation } from "@/lib/hooks/use-chat-session-navigation";
import { useChatSessionLoader } from "@/lib/hooks/use-chat-session-loader";
import { useSessionList } from "@/lib/hooks/use-session-list";
import { type Language, type Level, type Message } from "@/lib/types";
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
  const { sessions, refresh: refreshSessions, rename: renameSession, remove: removeSession } = useSessionList();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const applyLoadedSession = useCallback((loaded: { sessionId: string; language: Language; level: Level; messages: Message[] }) => {
    setInitialMessages(loaded.messages);
    setLanguage(loaded.language);
    setLevel(loaded.level);
    setSessionId(loaded.sessionId);
  }, []);
  const { switchingSession, switchingRef, switchToSession } = useChatSessionNavigation(router, applyLoadedSession);

  const { loading, forceReady } = useChatSessionLoader({
    sessionId: sessionIdParam,
    router,
    refreshSessions,
    updateSession,
    switchingRef,
    onSessionLoaded: applyLoadedSession,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Reload sessions list when returning from creating a new session
  /** Optimistic rename — update sidebar immediately, sync in background (Issue #46). */
  const handleRenameSession = useCallback(async (targetSessionId: string, newTitle: string) => {
    // Optimistic update
    await renameSession(targetSessionId, newTitle);
  }, [renameSession]);

  /** Optimistic delete — remove from sidebar immediately, sync in background (Issue #46). */
  const handleDeleteSession = useCallback(async (targetSessionId: string, wasActive: boolean) => {
    const { deleted, remaining } = await removeSession(targetSessionId);
    if (!deleted) return;

    if (wasActive) {
      // Navigate to the most recent remaining session
      const sorted = remaining
        .filter(s => s.session_id)
        .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      if (sorted.length > 0 && sorted[0].session_id) {
        router.push(`/chat?session=${sorted[0].session_id}`);
      } else {
        router.push("/language");
      }
    }
  }, [removeSession, router]);

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
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
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
