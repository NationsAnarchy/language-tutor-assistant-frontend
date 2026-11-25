import { langFromBackend, mapChatHistory, type SessionWithHistory } from '@/lib/api'
import { isLanguage, isLevel, type Language, type Level, type Message } from '@/lib/types'

export interface LoadedChatSession {
  sessionId: string
  language: Language
  level: Level
  messages: Message[]
}

/** Converts one backend session into the chat screen's complete initial state. */
export function hydrateChatSession(session: SessionWithHistory): LoadedChatSession {
  const language = langFromBackend(session.language)
  return {
    sessionId: session.session_id,
    language: isLanguage(language) ? language : 'english',
    level: isLevel(session.level) ? session.level : 'beginner',
    messages: mapChatHistory(session.chat_history),
  }
}
