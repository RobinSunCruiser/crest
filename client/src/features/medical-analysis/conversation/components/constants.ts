/**
 * Constants for the Live Conversation History Modal
 */

export const STREAMING_TIMEOUT_MS = 3000;
export const STREAMING_UPDATE_DEBOUNCE_MS = 100;
export const MESSAGE_TRUNCATE_LENGTH = 200;
export const MODAL_HEIGHT = '90vh';
export const SCROLL_AREA_HEIGHT = '70vh';

export const ROLE_COLORS = {
  system: 'gray',
  user: 'blue', 
  assistant: 'green'
} as const;

export const MESSAGE_ICONS = {
  user: 'User',
  assistant: 'Bot', 
  system: 'Settings'
} as const;