/**
 * Types for the Live Conversation History components
 */
import { LiveConversationEntry, ConversationSession } from '@/features/medical-analysis/conversation/hooks/useLiveConversationHistory';

export interface LiveConversationHistoryModalProps {
  opened: boolean;
  onClose: () => void;
}

export interface MessageCardProps {
  message: LiveConversationEntry;
  expandedMessages: Set<string>;
  onToggleExpansion: (messageId: string) => void;
}

export interface SessionTabsProps {
  activeSessions: ConversationSession[];
  selectedSessionId: string | null;
  streamingStatus: Map<string, boolean>;
  onTabChange: (sessionId: string | null) => void;
}

export interface SessionPanelProps {
  session: ConversationSession;
  expandedMessages: Set<string>;
  showScrollButton: boolean;
  onToggleExpansion: (messageId: string) => void;
  onClearSession: (session: ConversationSession) => void;
  onResumeAutoScroll: () => void;
  onSetScrollAreaRef: (sessionId: string, node: HTMLDivElement | null) => void;
}

export interface StreamingCallbacks {
  onStreamingStart: (sessionId: string) => void;
  onStreamingEnd: (sessionId: string) => void;
}