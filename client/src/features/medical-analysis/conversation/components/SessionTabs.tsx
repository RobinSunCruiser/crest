import React from 'react';
import { Tabs, Group, Text, Badge } from '@mantine/core';
import { Circle } from 'lucide-react';
import { ConversationSession } from '@/features/medical-analysis/conversation/hooks/useLiveConversationHistory';

interface SessionTabsProps {
  activeSessions: ConversationSession[];
  selectedSessionId: string | null;
  streamingStatus: Map<string, boolean>;
  onTabChange: (sessionId: string | null) => void;
}

export const SessionTabs: React.FC<SessionTabsProps> = ({ 
  activeSessions, 
  selectedSessionId, 
  streamingStatus, 
  onTabChange 
}) => {
  const getModelDisplayName = (modelId: string) => {
    const parts = modelId.split('-');
    if (parts.length > 1) {
      const modelName = parts.slice(1).join('-');
      return modelName.toUpperCase().replace(/[:.]/g, ':');
    }
    return modelId.length > 15 ? modelId.substring(0, 15) + '...' : modelId.toUpperCase();
  };

  return (
    <Tabs value={selectedSessionId} onChange={onTabChange}>
      <Tabs.List>
        {activeSessions.map(session => {
          const isStreaming = streamingStatus.get(session.conversationId) || false;
          const messageCount = session.messages.filter(m => m.role !== 'system').length;
          const modelDisplayName = getModelDisplayName(session.modelId);
          
          return (
            <Tabs.Tab key={session.conversationId} value={session.conversationId}>
              <Group gap="xs">
                <Text size="sm">{modelDisplayName}</Text>
                {isStreaming && <Circle size={8} color="green" fill="green" />}
                <Badge size="xs" color={session.isActive ? 'green' : 'gray'}>
                  {messageCount}
                </Badge>
              </Group>
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
      {/* Children (Tabs.Panel components) will be rendered by parent */}
    </Tabs>
  );
};