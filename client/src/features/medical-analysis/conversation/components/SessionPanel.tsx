import React from 'react';
import { Tabs, Group, Button, ScrollArea, Stack, Text, Box, Transition } from '@mantine/core';
import { ChevronDown } from 'lucide-react';
import { ConversationSession } from '@/features/medical-analysis/conversation/hooks/useLiveConversationHistory';
import { MessageCard } from './MessageCard';
import { SCROLL_AREA_HEIGHT } from './constants';
import cssStyles from '@/shared/styles/common.module.css';

interface SessionPanelProps {
  session: ConversationSession;
  expandedMessages: Set<string>;
  showScrollButton: boolean;
  onToggleExpansion: (messageId: string) => void;
  onClearSession: (session: ConversationSession) => void;
  onResumeAutoScroll: () => void;
  onSetScrollAreaRef: (sessionId: string, node: HTMLDivElement | null) => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  session,
  expandedMessages,
  showScrollButton,
  onToggleExpansion,
  onClearSession,
  onResumeAutoScroll,
  onSetScrollAreaRef
}) => {
  const handleClearSession = () => {
    onClearSession(session);
  };

  const handleResumeAutoScroll = () => {
    onResumeAutoScroll();
  };

  const handleScrollAreaRef = (node: HTMLDivElement | null) => {
    onSetScrollAreaRef(session.conversationId, node);
  };

  const renderMessages = () => {
    if (session.messages.length === 0) {
      return (
        <Text ta="center" c="dimmed" py="md">
          No messages in this conversation yet.
        </Text>
      );
    }
    
    if (session.messages.filter(msg => msg.role !== 'system').length === 0) {
      return (
        <Text ta="center" c="dimmed" py="md">
          Session initialized. Waiting for conversation to start...
        </Text>
      );
    }
    
    return session.messages.map(message => (
      <MessageCard 
        key={message.id} 
        message={message}
        expandedMessages={expandedMessages}
        onToggleExpansion={onToggleExpansion}
      />
    ));
  };

  return (
    <Tabs.Panel 
      key={session.conversationId} 
      value={session.conversationId} 
      pt="md"
className={cssStyles.relativePosition}
    >
      <Group justify="flex-end" mb="sm">
        <Button
          variant="outline"
          size="xs"
          color="red"
          onClick={handleClearSession}
        >
          Clear
        </Button>
      </Group>

      <ScrollArea.Autosize 
        mah={SCROLL_AREA_HEIGHT}
        viewportRef={handleScrollAreaRef}
      >
        <Stack gap="xs" pr="sm">
          {renderMessages()}
        </Stack>
      </ScrollArea.Autosize>

      <Transition
        mounted={showScrollButton}
        transition="slide-up"
        duration={200}
      >
        {(styles) => (
          <Box
            className={cssStyles.absoluteBottomRight}
            style={styles}
          >
            <Button
              size="sm"
              leftSection={<ChevronDown size={16} />}
              onClick={handleResumeAutoScroll}
              variant="filled"
              color="blue"
              className={cssStyles.scrollButton}
            >
              Activate Autoscroll
            </Button>
          </Box>
        )}
      </Transition>
    </Tabs.Panel>
  );
};