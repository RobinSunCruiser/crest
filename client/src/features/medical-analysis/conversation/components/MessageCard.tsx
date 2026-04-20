import React, { useCallback } from 'react';
import { Box, Group, Badge, Text, ActionIcon } from '@mantine/core';
import { User, Bot, Settings, MessageSquare, Copy, FileText, Merge, Files, Percent } from 'lucide-react';
import { LiveConversationEntry } from '@/features/medical-analysis/conversation/hooks/useLiveConversationHistory';
import { MESSAGE_TRUNCATE_LENGTH, ROLE_COLORS, MESSAGE_ICONS } from './constants';
import styles from '@/shared/styles/common.module.css';

interface MessageCardProps {
  message: LiveConversationEntry;
  expandedMessages: Set<string>;
  onToggleExpansion: (messageId: string) => void;
}

const iconComponents = {
  User: <User size={14} />,
  Bot: <Bot size={14} />,
  Settings: <Settings size={14} />,
  MessageSquare: <MessageSquare size={14} />
};

export const MessageCard = React.memo<MessageCardProps>(({ 
  message, 
  expandedMessages, 
  onToggleExpansion 
}) => {
  const shouldTruncate = (message.role === 'user' || message.role === 'system') && message.content.length > MESSAGE_TRUNCATE_LENGTH;
  const isExpanded = expandedMessages.has(message.id);
  const roleColor = ROLE_COLORS[message.role as keyof typeof ROLE_COLORS] || 'gray';

  const getBatchBadges = useCallback(() => {
    const badges: JSX.Element[] = [];
    
    if (!message.batchContext) return null;

    // Entity/Relation/Probability/Validation badge - always show for user messages
    if (message.batchContext.analysisStep && message.role === 'user') {
      const stepConfig = {
        'entity': { icon: User, color: 'blue', text: 'Entity' },
        'relation': { icon: MessageSquare, color: 'blue', text: 'Relation' },
        'probability': { icon: Percent, color: 'blue', text: 'Probability' },
        'validation': { icon: Settings, color: 'blue', text: 'Validation' },
      };

      const config = stepConfig[message.batchContext.analysisStep];
      if (!config) {
        // Skip rendering if step is unknown
        return badges;
      }
      const IconComponent = config.icon;
      
      badges.push(
        <Badge key="analysis-step" color={config.color} variant="light" size="sm">
          <Group gap={4}>
            <IconComponent size={10} />
            <span>{config.text}</span>
          </Group>
        </Badge>
      );
    }

    // Page badge - show if pages exist
    if (message.batchContext.pages && message.batchContext.pages.length > 0) {
      const pageText = message.batchContext.pages.length === 1 
        ? `Page ${message.batchContext.pages[0]}`
        : `Pages ${message.batchContext.pages[0]}-${message.batchContext.pages[message.batchContext.pages.length - 1]}`;
      
      const PageIcon = message.batchContext.pages.length === 1 ? FileText : Files;
      
      badges.push(
        <Badge key="page" color="blue" variant="light" size="sm">
          <Group gap={4}>
            <PageIcon size={10} />
            <span>{pageText}</span>
          </Group>
        </Badge>
      );
    }

    // Merge badge - show if it's a merge
    if (message.batchContext.isMerge) {
      badges.push(
        <Badge key="merge" color="blue" variant="light" size="sm">
          <Group gap={4}>
            <Merge size={10} />
            <span>Merge</span>
          </Group>
        </Badge>
      );
    }

    return badges.length > 0 ? badges : null;
  }, [message.batchContext, message.role]);
  
  const handleCopyClick = useCallback(() => {
    navigator.clipboard.writeText(message.content);
  }, [message.content]);

  const handleToggleExpansion = useCallback(() => {
    onToggleExpansion(message.id);
  }, [message.id, onToggleExpansion]);

  const formatTimestamp = (timestamp: Date) => 
    timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

  const getRoleIcon = (role: string) => {
    const iconName = MESSAGE_ICONS[role as keyof typeof MESSAGE_ICONS];
    return iconComponents[iconName as keyof typeof iconComponents] || iconComponents.MessageSquare;
  };

  const getDisplayContent = (message: LiveConversationEntry, isExpanded: boolean) => {
    if ((message.role === 'user' || message.role === 'system') && message.content.length > MESSAGE_TRUNCATE_LENGTH && !isExpanded) {
      return message.content.substring(0, MESSAGE_TRUNCATE_LENGTH) + '...';
    }
    return message.content;
  };

  return (
    <Box 
      mb="xs" 
      p="sm" 
      style={{ 
        backgroundColor: `var(--mantine-color-${roleColor}-0)`,
        border: `1px solid var(--mantine-color-${roleColor}-2)`,
        borderRadius: 'var(--mantine-radius-sm)'
      }}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          {getRoleIcon(message.role)}
          <Badge color={roleColor} variant="light" size="sm">
            {message.role.toUpperCase()}
          </Badge>
          {getBatchBadges()}
        </Group>
        <Group gap="xs">
          <Text size="xs" c="dimmed">
            {formatTimestamp(message.timestamp)}
          </Text>
          <ActionIcon
            variant="subtle"
            size="xs"
            onClick={handleCopyClick}
            aria-label="Copy message content"
          >
            <Copy size={12} />
          </ActionIcon>
        </Group>
      </Group>
      
      <Group justify="space-between" align="flex-end">
        <Text 
          size="sm" 
          className={message.role === 'system' ? styles.preWrapText + ' ' + styles.monospace : styles.preWrapText}
          style={{ flex: 1, marginRight: shouldTruncate ? '8px' : '0' }}
        >
          {getDisplayContent(message, isExpanded)}
        </Text>
        
        {shouldTruncate && (
          <Text 
            size="xs" 
            c="blue" 
            className={styles.clickableText}
            onClick={handleToggleExpansion}
            style={{ 
              flexShrink: 0,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Text>
        )}
      </Group>
    </Box>
  );
});

MessageCard.displayName = 'MessageCard';