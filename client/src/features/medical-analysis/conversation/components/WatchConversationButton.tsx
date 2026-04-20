import React, { useState, useMemo } from 'react';
import { Button, Badge, Group, Card, Text } from '@mantine/core';
import { MessageSquare, Activity, Eye } from 'lucide-react';
import { useLiveConversationHistory } from '@/features/medical-analysis/conversation/hooks/useLiveConversationHistory';
import { LiveConversationHistoryModal } from './LiveConversationHistoryModal';

interface WatchConversationButtonProps {
  className?: string;
}

export const WatchConversationButton: React.FC<WatchConversationButtonProps> = ({
  className
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { hasActiveSessions, totalMessages, activeSessions } = useLiveConversationHistory();

  const conversationStats = useMemo(() => {
    const activeCount = activeSessions.length;
    const hasLiveSessions = activeSessions.some(s => s.isActive);
    const conversationText = activeCount === 1 ? 'conversation' : 'conversations';
    
    return {
      activeCount,
      hasLiveSessions,
      statusText: `${activeCount} active ${conversationText} • ${totalMessages} messages`
    };
  }, [activeSessions, totalMessages]);

  if (!hasActiveSessions) {
    return null;
  }

  return (
    <>
      <Card withBorder shadow="sm" radius="md" p="md" bg="blue.0">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Eye size={20} color="var(--mantine-color-blue-6)" />
            <div>
              <Text size="sm" fw={600} c="blue.7">
                Live Conversation Monitor
              </Text>
              <Text size="xs" c="dimmed">
                {conversationStats.statusText}
              </Text>
            </div>
          </Group>
          
          <Group gap="xs">
            {conversationStats.hasLiveSessions && (
              <Badge color="green" variant="light" size="sm">
                <Group gap={4}>
                  <Activity size={10} />
                  <span>Live</span>
                </Group>
              </Badge>
            )}
            <Button
              variant="light"
              color="blue"
              size="sm"
              leftSection={<MessageSquare size={14} />}
              onClick={() => setModalOpen(true)}
              className={className}
            >
              Watch
            </Button>
          </Group>
        </Group>
      </Card>

      <LiveConversationHistoryModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};