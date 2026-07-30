"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, BookOpen, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import MDEditor, { commands } from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { Button } from "@/components/ui/button";
import { TopBar } from "../layout/top-bar";
import { ChatBubble } from "./chat-bubble";
import { ChatBubbleError } from "./chat-bubble-error";
import { ExercisePanel } from "./exercise-panel";
import { MistakesPanel } from "./mistakes-panel";
import {
  sendChatStream,
  getSession,
  synthesizeAudio,
  invalidateSessionCache,
  mapChatHistory,
  handleApiError,
  ApiError,
} from "@/lib/api";
import type { Language, Level, User, Message } from "@/lib/types";
import { CHAT_PLACEHOLDERS } from "@/lib/types";

// Starter prompt suggestions per language
const STARTER_PROMPTS: Record<Language, string[]> = {
  korean: [
    "안녕하세요 — introduce yourself",
    "날씨에 대해 이야기해요",
    "식당을 추천해주세요",
  ],
  japanese: [
    "自己紹介をしてください",
    "趣味について話しましょう",
    "おすすめの場所を教えて",
  ],
  english: [
    "Introduce yourself",
    "Describe your daily routine",
    "Talk about a hobby",
  ],
};

/**
 * Return a localized "backend not connected" fallback message.
 */
function demoFallback(language: Language): string {
  if (language === "korean")
    return "백엔드에 연결되지 않았어요. uvicorn app.main:app --reload 로 백엔드를 시작해 주세요.";
  if (language === "japanese")
    return "バックエンドに接続できませんでした。uvicorn app.main:app --reload でバックエンドを起動してください。";
  return "Backend not connected. Start it with: uvicorn app.main:app --reload";
}

/**
 * Stream an agent reply and optionally synthesize audio for it.
 * Shared between sendMessage and handleExerciseSubmit to avoid duplicating
 * the placeholder + token-append + cache-invalidate + TTS flow.
 */
async function streamAgentReply({
  sessionId,
  content,
  signal,
  language,
  setMessages,
  setIsLoading,
  audioAbortRef,
  setAudioLoadingId,
  setAudioFailures,
}: {
  sessionId: string;
  content: string;
  signal?: AbortSignal;
  language: Language;
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
  setIsLoading: (loading: boolean) => void;
  audioAbortRef: React.MutableRefObject<AbortController | null>;
  setAudioLoadingId: (id: string | null) => void;
  setAudioFailures: (
    updater: (prev: Map<string, string>) => Map<string, string>,
  ) => void;
}): Promise<string> {
  // Placeholder agent message — tokens stream into it
  const msgId = (Date.now() + 1).toString();
  const agentMsg: Message = {
    id: msgId,
    role: "agent",
    content: "",
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, agentMsg]);

  const result = await sendChatStream(
    sessionId,
    content,
    (event) => {
      if (event.type === "token" && event.content) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: m.content + event.content } : m,
          ),
        );
      }
    },
    signal,
  );

  invalidateSessionCache(sessionId);
  setIsLoading(false);

  // TTS: show loading indicator, synthesize in background
  const audioController = new AbortController();
  audioAbortRef.current = audioController;

  setAudioLoadingId(msgId);
  synthesizeAudio(sessionId, result.reply, audioController.signal)
    .then((url) => {
      if (audioController.signal.aborted) return;
      setAudioLoadingId(null);
      if (url) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, audioUrl: url } : m)),
        );
      }
    })
    .catch((audioErr) => {
      if (audioController.signal.aborted) return;
      setAudioLoadingId(null);
      const hint =
        audioErr instanceof ApiError
          ? "Audio couldn't be generated right now."
          : "Audio unavailable.";
      setAudioFailures((prev) => new Map(prev).set(msgId, hint));
    });

  return result.reply;
}

/**
 * Synthesize audio for an exercise prompt (non-critical, silently ignore failures).
 */
function synthesizeExercisePrompt({
  sessionId,
  text,
  audioAbortRef,
  setExerciseAudioUrl,
}: {
  sessionId: string;
  text: string;
  audioAbortRef: React.MutableRefObject<AbortController | null>;
  setExerciseAudioUrl: (url: string) => void;
}) {
  const audioController = new AbortController();
  audioAbortRef.current = audioController;
  synthesizeAudio(sessionId, text, audioController.signal)
    .then((url) => {
      if (audioController.signal.aborted) return;
      if (url) setExerciseAudioUrl(url);
    })
    .catch(() => {
      // Audio for exercise prompt is non-critical — silently ignore failures
    });
}

/** Per-message error state attached to a failed user message. */
interface MessageError {
  message: string;
  retryable: boolean;
  /** The original content to resend on retry. */
  originalContent: string;
}

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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExerciseDrawerOpen, setIsExerciseDrawerOpen] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<
    { prompt: string; audioUrl?: string } | undefined
  >(undefined);
  const [isExerciseLoading, setIsExerciseLoading] = useState(false);
  /** Map of messageId → error info for failed user messages. */
  const [messageErrors, setMessageErrors] = useState<Map<string, MessageError>>(
    new Map(),
  );
  /** Audio failure hints: messageId → hint text. */
  const [audioFailures, setAudioFailures] = useState<Map<string, string>>(
    new Map(),
  );
  /** Exercise-panel-local error (shown inline, not as a toast). */
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  /** Whether the mistakes review panel is visible. */
  const [showMistakes, setShowMistakes] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioAbortRef = useRef<AbortController | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  // Cancel in-flight request when session changes or component unmounts (Issue #14)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioAbortRef.current?.abort();
    };
  }, [sessionId]);

  // Load initial messages when session changes (e.g., resuming after sign-out)
  // Always set — empty array is valid for a new session (fixes Issue #10).
  useEffect(() => {
    setMessages(initialMessages);
    // Clear per-message errors when switching sessions
    setMessageErrors(new Map());
    setAudioFailures(new Map());
    // Reset exercise state for the new conversation
    setCurrentExercise(undefined);
    setIsExerciseDrawerOpen(false);
    setIsExerciseLoading(false);
    setExerciseError(null);
  }, [initialMessages]);

  // Fallback: if we have a sessionId but no messages, try loading history from backend.
  // Keyed on sessionId so switching to a new (empty) session clears stale messages.
  useEffect(() => {
    if (!sessionId || sessionId === "demo-session") return;

    // Check if initialMessages already covered this session
    if (initialMessages.length > 0) return;

    let cancelled = false;

    getSession(sessionId)
      .then((data) => {
        if (cancelled) return;
        const history = mapChatHistory(data.chat_history);
        if (history.length > 0) {
          setMessages(history);
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, initialMessages]);

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

  /**
   * Handle an ApiError: show toast for global events (auth, network),
   * and return a user-friendly message for inline display.
   */
  const handleError = useCallback(
    (err: unknown): { message: string; retryable: boolean } =>
      handleApiError(err, router),
    [router],
  );

  const sendMessage = useCallback(
    async (content: string, retryOfId?: string) => {
      if (!content.trim()) return;

      const userMsg: Message = {
        id: retryOfId || Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      // If retrying, remove the old error
      if (retryOfId) {
        setMessageErrors((prev) => {
          const next = new Map(prev);
          next.delete(retryOfId);
          return next;
        });
        // Replace the old message in the list
        setMessages((prev) =>
          prev.map((m) => (m.id === retryOfId ? userMsg : m)),
        );
      } else {
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
      }

      setIsLoading(true);

      try {
        if (!sessionId || sessionId === "demo-session") {
          // Demo fallback when backend isn't available
          await new Promise((r) => setTimeout(r, 1800));
          const agentMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: demoFallback(language),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentMsg]);
        } else {
          // Abort any previous in-flight request (Issue #14)
          abortRef.current?.abort();
          const controller = new AbortController();
          abortRef.current = controller;

          await streamAgentReply({
            sessionId,
            content,
            signal: controller.signal,
            language,
            setMessages,
            setIsLoading,
            audioAbortRef,
            setAudioLoadingId,
            setAudioFailures,
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User-initiated cancel (session switch) — don't show error
          return;
        }
        const { message, retryable } = handleError(err);
        setMessageErrors((prev) =>
          new Map(prev).set(userMsg.id, {
            message,
            retryable,
            originalContent: content,
          }),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, language, handleError],
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
    setMessageErrors((prev) => {
      const next = new Map(prev);
      next.delete(messageId);
      return next;
    });
  }, []);

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
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: answer,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setIsExerciseDrawerOpen(false);

    if (!sessionId || sessionId === "demo-session") {
      // Demo fallback
      await new Promise((r) => setTimeout(r, 1600));
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content:
            "Backend not available — start it with: uvicorn app.main:app --reload",
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      await streamAgentReply({
        sessionId,
        content: answer,
        language,
        setMessages,
        setIsLoading,
        audioAbortRef,
        setAudioLoadingId,
        setAudioFailures,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNewExercise = async () => {
    setIsExerciseLoading(true);
    setCurrentExercise(undefined);

    if (!sessionId || sessionId === "demo-session") {
      await new Promise((r) => setTimeout(r, 1200));
      setCurrentExercise({
        prompt:
          language === "korean"
            ? '다음 문장을 한국어로 번역하세요: "I went to the market yesterday to buy vegetables."'
            : language === "japanese"
              ? '次の文章を日本語に訳してください: "I went to the market yesterday to buy vegetables."'
              : 'Translate the following sentence into your target language: "I went to the market yesterday to buy vegetables."',
      });
      setIsExerciseLoading(false);
      setIsExerciseDrawerOpen(true);
      return;
    }

    setExerciseError(null);
    try {
      // Request a new exercise via the chat endpoint
      const exercisePrompt =
        language === "korean"
          ? "새로운 연습 문제를 만들어 주세요."
          : language === "japanese"
            ? "新しい練習問題を作ってください。"
            : "Please generate a new exercise for me.";

      const exResult = await sendChatStream(
        sessionId,
        exercisePrompt,
        () => {}, // no-op — exercise panel renders the full prompt at the end
      );
      setCurrentExercise({ prompt: exResult.reply });
      setIsExerciseDrawerOpen(true);

      synthesizeExercisePrompt({
        sessionId,
        text: exResult.reply,
        audioAbortRef,
        setExerciseAudioUrl: (url) =>
          setCurrentExercise((prev) =>
            prev ? { ...prev, audioUrl: url } : prev,
          ),
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // Show error inline in the exercise panel instead of as a toast
      const msg =
        err instanceof ApiError
          ? err.message
          : "Failed to generate exercise. Please try again.";
      setExerciseError(msg);
    } finally {
      setIsExerciseLoading(false);
    }
  };

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
        <main
          className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-5"
          aria-label="Conversation"
          aria-live="polite"
          aria-atomic="false"
        >
          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatBubble
                message={msg}
                isAudioLoading={audioLoadingId === msg.id}
                audioFailureHint={audioFailures.get(msg.id)}
              />
              {messageErrors.has(msg.id) && (
                <ChatBubbleError
                  message={messageErrors.get(msg.id)!.message}
                  onRetry={
                    messageErrors.get(msg.id)!.retryable
                      ? () => handleRetry(msg.id)
                      : undefined
                  }
                  onDismiss={() => handleDismissError(msg.id)}
                />
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </main>
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
            <MistakesPanel sessionId={sessionId} />
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
                handleRequestNewExercise();
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
              <MDEditor
                value={inputValue}
                onChange={isLoading ? undefined : handleEditorChange}
                preview="edit"
                height={128}
                aria-label="Message input"
                textareaProps={{
                  placeholder: CHAT_PLACEHOLDERS[language],
                  disabled: isLoading,
                }}
                commands={[
                  commands.bold,
                  commands.italic,
                  commands.strikethrough,
                  commands.quote,
                  commands.divider,
                  commands.orderedListCommand,
                  commands.unorderedListCommand,
                ]}
              />
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
