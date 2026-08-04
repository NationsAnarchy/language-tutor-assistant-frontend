"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Send, BookOpen, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopBar } from "../layout/top-bar";
import { ChatMessageList } from "./chat-message-list";
import { ExercisePanel } from "./exercise-panel";
import { MistakesPanel } from "./mistakes-panel";
import type { PracticeType } from "@/lib/api";
import type { Language, Level, User, Message } from "@/lib/types";
import { CHAT_PLACEHOLDERS } from "@/lib/types";
import { STARTER_PROMPTS } from "./chat-helpers";
import { useChatWorkflow } from "./use-chat-workflow";

const MarkdownEditor = dynamic(() => import('./markdown-editor'), {
  ssr: false,
  loading: () => <div className="h-32 p-3 text-sm text-muted-foreground" role="status">Loading message editor…</div>,
})


interface ChatScreenProps {
  user: User;
  language: Language;
  level: Level;
  sessionId: string | null;
  initialMessages?: Message[];
  onSwitchLanguage: () => void;
  onSignOut: () => void;
  onLoadingChange?: (loading: boolean) => void;
  /** Callback to toggle the session sidebar on mobile. */
  onToggleSidebar?: () => void;
  /** Whether the sidebar is currently open. */
  sidebarOpen?: boolean;
}

export function ChatScreen({
  user,
  language,
  level,
  sessionId,
  initialMessages = [],
  onSwitchLanguage,
  onSignOut,
  onLoadingChange,
  onToggleSidebar,
  sidebarOpen,
}: ChatScreenProps) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const [isExerciseDrawerOpen, setIsExerciseDrawerOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<
    { prompt: string; audioUrl?: string; feedback?: string; feedbackAudioUrl?: string } | undefined
  >(undefined);
  const [isExerciseLoading, setIsExerciseLoading] = useState(false);
  const [practiceType, setPracticeType] = useState<PracticeType>("grammar");
  /** Exercise-panel-local error (shown inline, not as a toast). */
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  /** Whether the mistakes review panel is visible. */
  const [showMistakes, setShowMistakes] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, messageErrors, audioFailures, audioLoadingId, submit, requestPractice, retryAudio, dismissError } = useChatWorkflow({ sessionId, language, initialMessages, router });

  // Load initial messages when session changes (e.g., resuming after sign-out)
  // Always set — empty array is valid for a new session (fixes Issue #10).
  useEffect(() => {
    // Reset exercise state for the new conversation
    setCurrentExercise(undefined);
    setIsExerciseDrawerOpen(false);
    setIsExerciseLoading(false);
    setExerciseError(null);
  }, [initialMessages]);

  // Auto-scroll to bottom on new messages.
  // Use instant scroll during active streaming (tokens arrive faster than a smooth
  // animation can complete, causing jank) and smooth for completed responses.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isLoading ? "instant" : "smooth",
    });
  }, [messages, isLoading]);

  // Notify parent of loading state (Issue #35)
  useEffect(() => {
    onLoadingChange?.(isLoading);
  }, [isLoading, onLoadingChange]);

  // Wire markdown editor value changes to input state.
  const handleEditorChange = useCallback((value?: string) => {
    setInputValue(value || "");
  }, []);

  const sendMessage = useCallback(
    async (content: string, retryOfId?: string) => {
      if (!content.trim()) return;
      if (!retryOfId) setInputValue("");
      await submit(content, { retryOfId });
    },
    [submit],
  );

  const handleRetry = useCallback(
    (messageId: string) => {
      const errorInfo = messageErrors.get(messageId);
      if (!errorInfo) return;
      sendMessage(errorInfo.originalContent, messageId);
    },
    [messageErrors, sendMessage],
  );

  const handleDismissError = useCallback((messageId: string) => {
    dismissError(messageId);
  }, [dismissError]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage(inputValue);
  }, [inputValue, isLoading, sendMessage]);

  // Ref to wrap MDEditor for Shift+Enter keyboard capture
  const editorWrapRef = useRef<HTMLDivElement>(null);

  // Shift+Enter to send, Enter for new line
  useEffect(() => {
    const container = editorWrapRef.current;
    if (!container) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleSend();
      }
    };
    container.addEventListener("keydown", handler, true);
    return () => container.removeEventListener("keydown", handler, true);
  }, [handleSend]);

  const handleExerciseSubmit = async (answer: string) => {
    await submit(answer, {
      beforeSubmit: () => setCurrentExercise((previous) => previous ? { ...previous, feedback: undefined, feedbackAudioUrl: undefined } : previous),
      onComplete: (feedback) => setCurrentExercise((previous) => previous ? { ...previous, feedback } : previous),
      onAudio: (feedbackAudioUrl) => setCurrentExercise((previous) => previous ? { ...previous, feedbackAudioUrl } : previous),
      onError: setExerciseError,
      demoResponse: "Backend not available — start it with: uvicorn app.main:app --reload",
    });
  };

  const handleRequestNewExercise = useCallback(async (selectedType: PracticeType = practiceType) => {
    if (isLoading || isExerciseLoading) return;
    setIsExerciseLoading(true);
    setCurrentExercise(undefined);
    setExerciseError(null);
    await requestPractice(selectedType, {
      onComplete: (prompt) => { setCurrentExercise({ prompt }); setIsExerciseDrawerOpen(true); },
      onAudio: (audioUrl) => setCurrentExercise((previous) => previous ? { ...previous, audioUrl } : previous),
      onError: setExerciseError,
      demoResponse: language === "korean"
        ? '다음 문장을 한국어로 번역하세요: "I went to the market yesterday to buy vegetables."'
        : language === "japanese"
          ? '次の文章を日本語に訳してください: "I went to the market yesterday to buy vegetables."'
          : 'Translate the following sentence into your target language: "I went to the market yesterday to buy vegetables."',
    });
    setIsExerciseLoading(false);
  }, [isExerciseLoading, isLoading, language, practiceType, requestPractice]);

  const handlePracticeMistakes = useCallback(() => {
    setPracticeType("mistake_review");
    setIsExerciseDrawerOpen(true);
    void handleRequestNewExercise("mistake_review");
  }, [handleRequestNewExercise]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <TopBar
        user={user}
        language={language}
        level={level}
        onSwitchLanguage={onSwitchLanguage}
        onSignOut={onSignOut}
        disabled={isLoading}
        onToggleSidebar={onToggleSidebar}
        sidebarOpen={sidebarOpen}
      />

      {/* Empty state — separate from scrollable message area to avoid any overflow */}
      {isEmpty ? (
        <main
          className="flex-1 flex flex-col items-center justify-center px-4 gap-6 text-center"
          aria-label="Conversation"
        >
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-foreground text-base">
              Ready to practice!
            </p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed text-pretty">
              {language === "korean"
                ? "한국어로 말씀해 보세요. 틀려도 괜찮아요 — 함께 고쳐 나가겠습니다."
                : language === "japanese"
                  ? "日本語で話してみてください。間違えても大丈夫です。"
                  : "Say anything to get started — mistakes are welcome, your tutor will help."}
            </p>
          </div>
          <div
            className="flex flex-wrap gap-2 justify-center max-w-sm"
            aria-label="Suggested starters"
          >
            {STARTER_PROMPTS[language].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </main>
      ) : (
        <ChatMessageList messages={messages} audioLoadingId={audioLoadingId} audioFailures={audioFailures} errors={messageErrors} onRetry={handleRetry} onRetryAudio={retryAudio} onDismiss={handleDismissError} endRef={messagesEndRef} />
      )}

      {/* Mistakes review panel — collapsible inline section */}
      {showMistakes && sessionId && sessionId !== "demo-session" && (
        <div className="border-t border-border bg-card/50 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between px-4 pt-3">
              <h3 className="text-sm font-semibold text-foreground">Mistakes to Review</h3>
              <button
                type="button"
                onClick={() => setShowMistakes(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <MistakesPanel sessionId={sessionId} onRequestPractice={handlePracticeMistakes} />
          </div>
        </div>
      )}

      {/* Chat input — always visible */}
      <div className="px-4 py-3 border-t border-border bg-card/70 backdrop-blur-sm shrink-0">
        <div className="flex gap-2.5 items-end max-w-3xl mx-auto">
          {/* Mistakes toggle button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowMistakes((o) => !o)}
            disabled={isLoading}
            className="h-11 w-11 p-0 rounded-2xl shrink-0 shadow-xs"
            aria-label={showMistakes ? "Close mistakes panel" : "Review mistakes"}
            title={showMistakes ? "Close mistakes" : "Review mistakes"}
          >
            <AlertTriangle className={`size-4 ${showMistakes ? 'text-amber-500' : ''}`} aria-hidden="true" />
          </Button>

          {/* Exercise trigger button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (currentExercise && !isExerciseDrawerOpen) {
                // Resume last exercise
                setIsExerciseDrawerOpen(true);
              } else {
                setIsExerciseDrawerOpen(true);
              }
            }}
            disabled={isLoading || isExerciseLoading}
            className="h-11 w-11 p-0 rounded-2xl shrink-0 shadow-xs"
            aria-label={
              currentExercise ? "Resume exercise" : "Start a new exercise"
            }
            title={currentExercise ? "Resume exercise" : "New exercise"}
          >
            {isExerciseLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <BookOpen className="size-4" aria-hidden="true" />
            )}
          </Button>

          <div
            className="flex-1 min-w-0"
            ref={editorWrapRef}
          >
            <div className="md-editor-wrap rounded-2xl border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring transition-all shadow-xs">
              {editorReady ? (
                <MarkdownEditor value={inputValue} disabled={isLoading} placeholder={CHAT_PLACEHOLDERS[language]} onChange={handleEditorChange} />
              ) : (
                <button type="button" onClick={() => setEditorReady(true)} onFocus={() => setEditorReady(true)} className="h-32 w-full px-3 text-left text-sm text-muted-foreground" aria-label="Open message editor">
                  {CHAT_PLACEHOLDERS[language]}
                </button>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="h-11 w-11 p-0 rounded-2xl shrink-0 shadow-xs"
            aria-label="Send message"
          >
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-muted">Shift+Enter</kbd> to send
          {" "}·{" "}
          <kbd className="font-mono text-[10px] px-1 py-0.5 rounded border border-border bg-muted">Enter</kbd> for new line
          {" "}· Markdown supported
        </p>
      </div>
      {/* Exercise drawer overlay — must be outside the flex column to avoid
          disrupting the main content layout and scroll behavior */}
      <ExercisePanel
        language={language}
        onSubmitAnswer={handleExerciseSubmit}
        onRequestNew={handleRequestNewExercise}
        practiceType={practiceType}
        onPracticeTypeChange={setPracticeType}
        isLoading={isLoading || isExerciseLoading}
        currentExercise={currentExercise}
        error={exerciseError}
        onDismissError={() => setExerciseError(null)}
        isOpen={isExerciseDrawerOpen}
        onClose={() => setIsExerciseDrawerOpen(false)}
      />
    </div>
  );
}
