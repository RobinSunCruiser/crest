import { useState, useCallback, useEffect, useRef } from 'react';
import { conversationService } from '@/features/medical-analysis/conversation';
import type { ConversationMessage } from '@/features/medical-analysis/conversation';

/**
 * Represents a single conversation message with metadata for live tracking
 * Now extends ConversationMessage from the new ConversationService
 */
export interface LiveConversationEntry extends ConversationMessage {
  /** ID of the model that generated/received this message */
  modelId: string;
  /** ID of the conversation this message belongs to */
  conversationId: string;
  /** How long it took to process this message (optional) */
  processingTime?: number;
}

/**
 * Represents a complete conversation session with an LLM
 */
export interface ConversationSession {
  /** Unique identifier for the conversation */
  conversationId: string;
  /** ID of the model used in this conversation */
  modelId: string;
  /** All messages in this conversation */
  messages: LiveConversationEntry[];
  /** Whether the session is currently active */
  isActive: boolean;
  /** Timestamp of the last activity in this session */
  lastActivity: Date;
}

/**
 * Internal state structure for the live conversation history hook
 */
export interface LiveConversationState {
  /** Map of all tracked sessions by conversation ID */
  sessions: Map<string, ConversationSession>;
  /** Array of active session IDs */
  activeSessions: string[];
  /** Currently selected session ID for display */
  selectedSessionId: string | null;
}

/**
 * Callback interface for streaming state changes
 */
export interface StreamingCallbacks {
  /** Called when streaming starts for a session */
  onStreamingStart: (sessionId: string) => void;
  /** Called when streaming ends for a session */
  onStreamingEnd: (sessionId: string) => void;
}

// Constants
const SESSION_TIMEOUT_MS = 600000; // 10 minutes
const SESSION_CHECK_INTERVAL_MS = 2000;

/**
 * Hook for managing live conversation history across all LLM sessions.
 * Provides real-time updates, streaming support, and session management.
 *
 * @param streamingCallbacks - Optional callbacks for streaming state changes
 * @returns Object containing session data, actions, and computed properties
 */
export const useLiveConversationHistory = (streamingCallbacks?: StreamingCallbacks) => {
  const [state, setState] = useState<LiveConversationState>({
    sessions: new Map(),
    activeSessions: [],
    selectedSessionId: null,
  });

  const messageCallbacksRef = useRef<Map<string, (messages: ConversationMessage[]) => void>>(new Map());
  const sessionTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const streamingCallbacksRef = useRef<StreamingCallbacks | undefined>(streamingCallbacks);

  // Update streaming callbacks ref when prop changes
  useEffect(() => {
    streamingCallbacksRef.current = streamingCallbacks;
  }, [streamingCallbacks]);

  // Convert ConversationMessage to LiveConversationEntry
  const convertMessage = useCallback((
    message: ConversationMessage,
    conversationId: string,
    modelId: string
  ): LiveConversationEntry => ({
    ...message,
    modelId,
    conversationId,
  }), []);

  // Mark session as inactive after timeout
  const markSessionInactive = useCallback((conversationId: string) => {
    setState(prev => {
      const newSessions = new Map(prev.sessions);
      const session = newSessions.get(conversationId);
      if (session) {
        newSessions.set(conversationId, { ...session, isActive: false });
      }
      return {
        ...prev,
        sessions: newSessions,
        activeSessions: prev.activeSessions.filter(id => id !== conversationId),
      };
    });
  }, []);

  // Track a new conversation session
  const trackSession = useCallback((conversationId: string, modelId: string) => {
    // Skip if already tracking this session
    if (messageCallbacksRef.current.has(conversationId)) return;

    const session = conversationService.getAllSessions().get(conversationId);
    if (!session) return;

    // Create message update callback
    const messageCallback = (messages: ConversationMessage[]) => {
      const isCurrentlyStreaming = session.isStreaming();
      
      setState(prev => {
        const previousSession = prev.sessions.get(conversationId);
        const existingMessages = previousSession?.messages || [];
        
        // Preserve existing messages with their original timestamps and IDs
        const convertedMessages = messages.map((msg, index) => {
          const existingMessage = existingMessages[index];
          
          // If we have an existing message with same ID, preserve metadata but update content
          if (existingMessage && existingMessage.id === msg.id) {
            return {
              ...existingMessage,
              content: msg.content, // Update content for streaming
              isStreaming: msg.isStreaming,
              batchContext: msg.batchContext, // Update batch context
            };
          }
          
          // New message, convert from ConversationMessage
          return convertMessage(msg, conversationId, modelId);
        });

        const wasStreaming = previousSession?.messages.some(m => m.isStreaming) || false;
        
        const updatedSession: ConversationSession = {
          conversationId,
          modelId,
          messages: convertedMessages,
          isActive: true,
          lastActivity: new Date(),
        };

        // Handle streaming state changes
        const callbacks = streamingCallbacksRef.current;
        if (callbacks) {
          if (isCurrentlyStreaming && !wasStreaming) {
            callbacks.onStreamingStart(conversationId);
          } else if (!isCurrentlyStreaming && wasStreaming) {
            callbacks.onStreamingEnd(conversationId);
          }
        }

        // Update session timeout
        clearTimeout(sessionTimersRef.current.get(conversationId));
        const timer = setTimeout(() => markSessionInactive(conversationId), SESSION_TIMEOUT_MS);
        sessionTimersRef.current.set(conversationId, timer);

        return {
          ...prev,
          sessions: new Map(prev.sessions).set(conversationId, updatedSession),
          activeSessions: prev.activeSessions.includes(conversationId) 
            ? prev.activeSessions 
            : [...prev.activeSessions, conversationId],
          selectedSessionId: prev.selectedSessionId || conversationId,
        };
      });
    };

    // Register callback
    messageCallbacksRef.current.set(conversationId, messageCallback);
    session.addOnMessageUpdate(messageCallback);
    
    // Initialize with current messages
    messageCallback(session.getMessages());
  }, [convertMessage, markSessionInactive]);

  // Untrack a session
  const untrackSession = useCallback((conversationId: string) => {
    const callback = messageCallbacksRef.current.get(conversationId);
    if (callback) {
      const session = conversationService.getAllSessions().get(conversationId);
      if (session) {
        session.removeOnMessageUpdate(callback);
      }
      messageCallbacksRef.current.delete(conversationId);
    }

    // Clear timer
    const timer = sessionTimersRef.current.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      sessionTimersRef.current.delete(conversationId);
    }

    setState(prev => {
      const newSessions = new Map(prev.sessions);
      newSessions.delete(conversationId);
      
      return {
        ...prev,
        sessions: newSessions,
        activeSessions: prev.activeSessions.filter(id => id !== conversationId),
        selectedSessionId: prev.selectedSessionId === conversationId 
          ? (prev.activeSessions[0] || null) 
          : prev.selectedSessionId,
      };
    });
  }, []);

  // Select a session to view
  const selectSession = useCallback((conversationId: string | null) => {
    setState(prev => ({ ...prev, selectedSessionId: conversationId }));
  }, []);

  // Clear all history for a session
  const clearSession = useCallback((conversationId: string) => {
    const session = conversationService.getAllSessions().get(conversationId);
    if (session) {
      session.resetConversation();
    }
    
    // Also clear from the live conversation history state
    setState(prev => {
      const newSessions = new Map(prev.sessions);
      const existingSession = newSessions.get(conversationId);
      if (existingSession) {
        // Keep the session but clear its messages
        newSessions.set(conversationId, {
          ...existingSession,
          messages: [],
          lastActivity: new Date()
        });
      }
      return {
        ...prev,
        sessions: newSessions
      };
    });
  }, []);

  // Clear all sessions
  const clearAllSessions = useCallback(() => {
    // Clear all callbacks and timers
    messageCallbacksRef.current.forEach((callback, conversationId) => {
      const session = conversationService.getAllSessions().get(conversationId);
      if (session) {
        session.removeOnMessageUpdate(callback);
      }
    });
    messageCallbacksRef.current.clear();

    sessionTimersRef.current.forEach(timer => clearTimeout(timer));
    sessionTimersRef.current.clear();

    setState({
      sessions: new Map(),
      activeSessions: [],
      selectedSessionId: null,
    });
  }, []);

  // Get current selected session
  const selectedSession = state.selectedSessionId 
    ? state.sessions.get(state.selectedSessionId) 
    : null;

  // Auto-track new sessions from ConversationService
  useEffect(() => {
    const checkForNewSessions = () => {
      const allSessions = conversationService.getAllSessions();
      allSessions.forEach((_session, conversationId) => {
        if (!messageCallbacksRef.current.has(conversationId)) {
          trackSession(conversationId, conversationId);
        }
      });
    };

    checkForNewSessions();
    const interval = setInterval(checkForNewSessions, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [trackSession]);

  // Cleanup on unmount
  useEffect(() => {
    // Copy refs to local variables inside the effect to fix exhaustive-deps warning
    const messageCallbacks = messageCallbacksRef.current;
    const sessionTimers = sessionTimersRef.current;

    return () => {
      messageCallbacks.forEach((callback, conversationId) => {
        const session = conversationService.getAllSessions().get(conversationId);
        if (session) {
          session.removeOnMessageUpdate(callback);
        }
      });
      messageCallbacks.clear();

      sessionTimers.forEach(timer => clearTimeout(timer));
      sessionTimers.clear();
    };
  }, []);

  return {
    sessions: Array.from(state.sessions.values()),
    activeSessions: state.activeSessions
      .map(id => state.sessions.get(id))
      .filter((session): session is ConversationSession => Boolean(session)),
    selectedSession,
    selectedSessionId: state.selectedSessionId,
    trackSession,
    untrackSession,
    selectSession,
    clearSession,
    clearAllSessions,
    hasActiveSessions: state.activeSessions.length > 0,
    totalMessages: Array.from(state.sessions.values())
      .reduce((sum, session) => sum + session.messages.length, 0),
    debugInfo: {
      allSessions: conversationService.getAllSessions().size,
      trackedSessions: state.sessions.size,
      activeCount: state.activeSessions.length
    }
  };
};