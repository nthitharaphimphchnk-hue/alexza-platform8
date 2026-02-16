/**
 * Chat Persistence Utilities
 * Handles localStorage-based message persistence per project
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  error?: boolean;
}

const CHAT_STORAGE_PREFIX = 'alexza_chat_';

/**
 * Get chat history for a specific project
 */
export function getChatHistory(projectId: string): ChatMessage[] {
  try {
    const key = `${CHAT_STORAGE_PREFIX}${projectId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load chat history:', error);
    return [];
  }
}

/**
 * Save chat history for a specific project
 */
export function saveChatHistory(projectId: string, messages: ChatMessage[]): void {
  try {
    const key = `${CHAT_STORAGE_PREFIX}${projectId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

/**
 * Add a message to chat history
 */
export function addMessage(
  projectId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  error: boolean = false
): ChatMessage {
  const messages = getChatHistory(projectId);
  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    error,
  };
  messages.push(newMessage);
  saveChatHistory(projectId, messages);
  return newMessage;
}

/**
 * Clear chat history for a project
 */
export function clearChatHistory(projectId: string): void {
  try {
    const key = `${CHAT_STORAGE_PREFIX}${projectId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
}

/**
 * Get initial welcome message
 */
export function getWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: "Hello! I'm your AI assistant. How can I help you today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Initialize chat history if empty
 */
export function initializeChatIfEmpty(projectId: string): ChatMessage[] {
  const messages = getChatHistory(projectId);
  if (messages.length === 0) {
    const welcome = getWelcomeMessage();
    saveChatHistory(projectId, [welcome]);
    return [welcome];
  }
  return messages;
}
