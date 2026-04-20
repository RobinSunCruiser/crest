import React, { useRef, useEffect, useState, useMemo, useCallback, startTransition } from 'react';
import { Modal, Title, Group, Badge, Stack, Text, Tabs, ScrollArea } from '@mantine/core';
import { MessageSquare } from 'lucide-react';
import { useLiveConversationHistory } from '@/features/medical-analysis/conversation/hooks/useLiveConversationHistory';
import {
  SessionTabs,
  SessionPanel,
  MODAL_HEIGHT,
  LiveConversationHistoryModalProps
} from '@/features/medical-analysis/conversation/components';

// Constants
const STREAMING_TIMEOUT_MS = 3000;

/**
 * Modal component for displaying live conversation history across all active LLM sessions.
 * Features streaming indicators, message expansion, and real-time updates.
 */

export const LiveConversationHistoryModal: React.FC<LiveConversationHistoryModalProps> = ({
  opened,
  onClose
}) => {
  // Track streaming status for each session with 3-second timeout
  const [streamingStatus, setStreamingStatus] = useState<Map<string, boolean>>(new Map());
  const streamingTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Track expanded messages by message ID
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Global auto-scroll state
  const [globalAutoScroll, setGlobalAutoScroll] = useState(true);
  const scrollAreaRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Streaming callbacks (keeping only what's needed for streaming status)
  const streamingCallbacks = useMemo(() => {
    const updateStreamingStatus = (sessionId: string, isStreaming: boolean) => {
      startTransition(() => {
        setStreamingStatus(prev => {
          if (prev.get(sessionId) === isStreaming) return prev;
          const newMap = new Map(prev);
          newMap.set(sessionId, isStreaming);
          return newMap;
        });
      });
    };

    return {
      onStreamingStart: (sessionId: string) => {
        const existing = streamingTimeoutRefs.current.get(sessionId);
        if (existing) clearTimeout(existing);

        updateStreamingStatus(sessionId, true);
        
        const timeout = setTimeout(() => {
          updateStreamingStatus(sessionId, false);
          streamingTimeoutRefs.current.delete(sessionId);
        }, STREAMING_TIMEOUT_MS);
        
        streamingTimeoutRefs.current.set(sessionId, timeout);
      },
      
      onStreamingEnd: (sessionId: string) => {
        const timeout = streamingTimeoutRefs.current.get(sessionId);
        if (timeout) {
          clearTimeout(timeout);
          streamingTimeoutRefs.current.delete(sessionId);
        }
        updateStreamingStatus(sessionId, false);
      }
    };
  }, []);

  const {
    activeSessions,
    selectedSessionId,
    selectSession,
    clearSession,
    hasActiveSessions,
    totalMessages,
  } = useLiveConversationHistory(streamingCallbacks);

  // Handle tab selection
  const handleTabChange = useCallback((sessionId: string | null) => {
    selectSession(sessionId);
  }, [selectSession]);

  const toggleMessageExpansion = useCallback((messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // Auto-scroll to bottom of selected session
  const scrollAllToBottom = useCallback(() => {
    if (selectedSessionId) {
      const scrollArea = scrollAreaRefs.current.get(selectedSessionId);
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [selectedSessionId]);

  const startGlobalAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }
    
    scrollIntervalRef.current = setInterval(scrollAllToBottom, 250);
    setGlobalAutoScroll(true);
  }, [scrollAllToBottom]);

  const stopGlobalAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setGlobalAutoScroll(false);
  }, []);

  // Handle manual scroll - stop auto-scroll if user scrolls up
  const handleScroll = useCallback((sessionId: string) => {
    if (!globalAutoScroll) return;
    
    const scrollArea = scrollAreaRefs.current.get(sessionId);
    if (!scrollArea) return;

    const atBottom = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight <= 50;
    
    if (!atBottom) {
      stopGlobalAutoScroll();
    }
  }, [globalAutoScroll, stopGlobalAutoScroll]);

  // Start auto-scroll when modal opens or when there are active sessions
  useEffect(() => {
    if (opened && activeSessions.length > 0 && globalAutoScroll && !scrollIntervalRef.current) {
      startGlobalAutoScroll();
    }
  }, [opened, activeSessions, globalAutoScroll, startGlobalAutoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    // Copy refs to local variables inside the effect to fix exhaustive-deps warning
    const streamingTimeouts = streamingTimeoutRefs.current;
    const scrollAreas = scrollAreaRefs.current;
    const scrollInterval = scrollIntervalRef.current;

    return () => {
      // Cleanup streaming timeouts
      streamingTimeouts.forEach(timeout => clearTimeout(timeout));
      streamingTimeouts.clear();
      
      // Cleanup global scroll interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
      
      scrollAreas.clear();
    };
  }, []);

  const handleClearSession = useCallback((session: any) => {
    clearSession(session.conversationId);
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      session.messages.forEach((msg: any) => newSet.delete(msg.id));
      return newSet;
    });
  }, [clearSession]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <MessageSquare size={20} />
          <Title order={3}>Live Conversation History</Title>
          {hasActiveSessions && (
            <Badge color="blue" variant="light">
              {totalMessages} messages
            </Badge>
          )}
        </Group>
      }
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
      styles={{
        content: {
          height: MODAL_HEIGHT,
          maxHeight: MODAL_HEIGHT
        }
      }}
    >
      <Stack gap="md">
        {!hasActiveSessions ? (
          <Text ta="center" c="dimmed" py="xl">
            No active LLM conversations. Start an analysis to see live updates here.
          </Text>
        ) : (
          <Tabs value={selectedSessionId} onChange={handleTabChange}>
            <SessionTabs
              activeSessions={activeSessions}
              selectedSessionId={selectedSessionId}
              streamingStatus={streamingStatus}
              onTabChange={handleTabChange}
            />

            {activeSessions.map(session => (
              <SessionPanel
                key={session.conversationId}
                session={session}
                expandedMessages={expandedMessages}
                showScrollButton={!globalAutoScroll}
                onToggleExpansion={toggleMessageExpansion}
                onClearSession={handleClearSession}
                onResumeAutoScroll={startGlobalAutoScroll}
                onSetScrollAreaRef={(sessionId: string, node: HTMLDivElement | null) => {
                  if (node) {
                    scrollAreaRefs.current.set(sessionId, node);
                    
                    // Add scroll listener for manual scroll detection
                    const scrollListener = () => handleScroll(sessionId);
                    node.addEventListener('scroll', scrollListener, { passive: true });
                  } else {
                    scrollAreaRefs.current.delete(sessionId);
                  }
                }}
              />
            ))}
          </Tabs>
        )}
      </Stack>
    </Modal>
  );
};