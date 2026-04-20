/**
 * @module Services/ConversationService
 *
 * Domain service for managing conversation sessions with LLMs.
 * Handles conversation lifecycle, message history, and batch context.
 * 
 * Responsibilities:
 * - Session creation and management
 * - Message history and updates
 * - Batch context association
 * - Streaming support
 */

import { v4 as uuidv4 } from 'uuid';
import { socketService } from '@/shared/services';
import { IChatRoleMessage } from '@root/server/src/interfaces/IChatRoleMessage';
import { IModelOptions } from '@root/server/src/interfaces';
import {
    EVENTS,
    LLMChatAbortMessage,
    LLMChatMessage,
    LLMChatResponse,
    LLMChatStreamChunkResponse,
    TimeoutError,
} from '@root/server/src/socket/apiObjects';
import { showNotification } from '@/shared/utils/notifications';

/** Batch context for analysis tracking */
export interface BatchContext {
    isMerge?: boolean;
    pages?: number[];
    analysisStep?: 'entity' | 'relation' | 'probability' | 'validation';
}

/** Extended message with batch context */
export interface ConversationMessage extends IChatRoleMessage {
    id: string;
    timestamp: Date;
    batchContext?: BatchContext;
    isStreaming?: boolean;
}

/** Conversation session interface */
export interface ConversationSession {
    conversationId: string;
    modelId: string;
    systemPrompt: string;
    messages: ConversationMessage[];
    isActive: boolean;
    isStreaming: boolean;
}

const TIMEOUT = 300000;

/**
 * Manages individual conversation sessions with LLMs
 */
export class ConversationManager {
    private conversationId: string;
    private modelId: string;
    private systemPrompt: string;
    private messages: ConversationMessage[] = [];
    private messageUpdateCallbacks: ((messages: ConversationMessage[]) => void)[] = [];
    private pendingRequests: Map<string, { resolve: (response: LLMChatResponse) => void; reject: (error: Error) => void }> = new Map();
    private abortedRequests: Set<string> = new Set();
    private timeoutHandlers: Map<string, NodeJS.Timeout> = new Map();
    private partialResponses: Map<string, string> = new Map();
    private currentlyStreaming: boolean = false;

    constructor(conversationId: string, modelId: string, systemPrompt?: string) {
        this.conversationId = conversationId;
        this.modelId = modelId;
        this.systemPrompt = systemPrompt || 'You are a helpful assistant';
        
        this.initializeSystemMessage();
        this.setupSocketListeners();
    }

    private initializeSystemMessage(): void {
        const systemMessage: ConversationMessage = {
            id: `${this.conversationId}-system-${Date.now()}`,
            role: 'system',
            content: this.systemPrompt,
            source: this.modelId,
            timestamp: new Date(),
        };
        this.messages = [systemMessage];
    }

    private setupSocketListeners(): void {
        socketService.on(EVENTS.LLM_CHAT_RESPONSE, this.handleResponse);
        socketService.on(EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE, this.handleStreamChunk);
    }

    private handleResponse = (response: LLMChatResponse): void => {
        if (!response.payload || response.payload.conversationID !== this.conversationId) {
            return;
        }

        const { requestID } = response.payload;
        const pendingRequest = this.pendingRequests.get(requestID);
        
        if (!pendingRequest) return;

        // Clear timeout
        const timeout = this.timeoutHandlers.get(requestID);
        if (timeout) {
            clearTimeout(timeout);
            this.timeoutHandlers.delete(requestID);
        }

        // Handle aborted requests
        if (this.abortedRequests.has(requestID)) {
            this.pendingRequests.delete(requestID);
            this.abortedRequests.delete(requestID);
            return;
        }

        this.pendingRequests.delete(requestID);
        this.currentlyStreaming = false;

        const { resolve, reject } = pendingRequest;

        if (response.error) {
            // Extract error message more thoroughly
            let errorMessage: string;

            if (typeof response.error === 'string') {
                errorMessage = response.error;
            } else if (response.error && typeof response.error === 'object') {
                // Handle error object with message property
                if ('message' in response.error && response.error.message && typeof response.error.message === 'string') {
                    errorMessage = response.error.message;
                } else {
                    // Fallback to JSON stringify for objects
                    errorMessage = JSON.stringify(response.error);
                }
            } else {
                errorMessage = 'Unknown error occurred';
            }

            // Show error notification to user
            showNotification({
                title: 'Server Error',
                message: errorMessage,
                type: 'error',
                autoClose: 8000
            });

            reject(new Error(errorMessage));
            return;
        }

        // Update or add assistant message
        if (response.data?.message) {
            this.updateAssistantMessage(response.data.message);
        }

        // Cleanup
        this.partialResponses.delete(requestID);
        resolve(response);
    };

    private handleStreamChunk = (message: LLMChatStreamChunkResponse): void => {
        const { requestID, conversationID } = message.payload;
        if (conversationID !== this.conversationId) return;

        this.currentlyStreaming = true;

        // Accumulate chunks
        const currentContent = this.partialResponses.get(requestID) || '';
        const newContent = currentContent + message.data.chunk;
        this.partialResponses.set(requestID, newContent);

        // Update assistant message with streaming content
        this.updateAssistantMessage(newContent, true);
    };

    private updateAssistantMessage(content: string, isStreaming: boolean = false): void {
        const lastMessage = this.messages[this.messages.length - 1];
        
        if (lastMessage && lastMessage.role === 'assistant') {
            // Update existing assistant message
            lastMessage.content = content;
            lastMessage.isStreaming = isStreaming;
        } else {
            // Add new assistant message
            const assistantMessage: ConversationMessage = {
                id: `${this.conversationId}-assistant-${Date.now()}`,
                role: 'assistant',
                content,
                source: this.modelId,
                timestamp: new Date(),
                isStreaming,
            };
            this.messages.push(assistantMessage);
        }

        this.notifyMessageUpdate();
    }

    /**
     * Send a message with optional batch context
     */
    async sendMessage(
        content: string, 
        modelOptions: IModelOptions,
        batchContext?: BatchContext,
        timeout: number = TIMEOUT
    ): Promise<LLMChatResponse> {
        // Prevent multiple simultaneous requests
        if (this.pendingRequests.size > 0) {
            throw new Error('Another request is already pending.');
        }

        const requestID = uuidv4();

        // Create user message with batch context
        const userMessage: ConversationMessage = {
            id: `${this.conversationId}-user-${Date.now()}`,
            role: 'user',
            content,
            source: this.modelId,
            timestamp: new Date(),
            batchContext,
        };

        // Add to message history
        this.messages.push(userMessage);
        this.notifyMessageUpdate();

        // Prepare socket message
        const socketMessage: LLMChatMessage = {
            event: EVENTS.LLM_CHAT_REQUEST,
            version: '0.1.0',
            data: {
                modelID: this.modelId,
                messages: [
                    { role: 'system', content: this.systemPrompt, source: this.modelId },
                    { role: 'user', content, source: this.modelId }
                ],
                modelOptions,
            },
            payload: { 
                requestID, 
                conversationID: this.conversationId,
                ...(batchContext && { batchContext })
            },
        };

        // Send message
        socketService.send(socketMessage);

        // Return promise
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestID, { resolve, reject });

            const timeoutHandler = setTimeout(() => {
                const abortMessage: LLMChatAbortMessage = {
                    event: EVENTS.LLM_CHAT_ABORT,
                    version: '0.1.0',
                    payload: { requestID },
                };

                socketService.send(abortMessage);
                reject(new TimeoutError(`Request timed out after ${timeout}ms`));
                this.pendingRequests.delete(requestID);
                this.timeoutHandlers.delete(requestID);
            }, timeout);

            this.timeoutHandlers.set(requestID, timeoutHandler);
        });
    }

    /**
     * Add message update callback
     */
    addOnMessageUpdate(callback: (messages: ConversationMessage[]) => void): void {
        this.messageUpdateCallbacks.push(callback);
    }

    /**
     * Remove message update callback
     */
    removeOnMessageUpdate(callback: (messages: ConversationMessage[]) => void): void {
        this.messageUpdateCallbacks = this.messageUpdateCallbacks.filter(cb => cb !== callback);
    }

    private notifyMessageUpdate(): void {
        this.messageUpdateCallbacks.forEach(callback => callback([...this.messages]));
    }

    /**
     * Get current messages
     */
    getMessages(): ConversationMessage[] {
        return [...this.messages];
    }

    /**
     * Check if currently streaming
     */
    isStreaming(): boolean {
        return this.currentlyStreaming;
    }

    /**
     * Reset conversation
     */
    resetConversation(newSystemPrompt?: string): void {
        if (newSystemPrompt) {
            this.systemPrompt = newSystemPrompt;
        }
        this.initializeSystemMessage();
        this.notifyMessageUpdate();
    }

    /**
     * Abort all pending requests
     */
    async abortRequests(): Promise<void> {
        this.currentlyStreaming = false;

        this.pendingRequests.forEach(({ reject }, requestID) => {
            const timeout = this.timeoutHandlers.get(requestID);
            if (timeout) {
                clearTimeout(timeout);
                this.timeoutHandlers.delete(requestID);
            }

            const abortMessage: LLMChatAbortMessage = {
                event: EVENTS.LLM_CHAT_ABORT,
                version: '0.1.0',
                payload: { requestID },
            };

            // Immediately reject the promise like old LLMService did
            reject(new Error('Request aborted by user'));
            this.abortedRequests.add(requestID);
            socketService.send(abortMessage);
        });

        this.pendingRequests.clear();
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.abortRequests();
        socketService.off(EVENTS.LLM_CHAT_RESPONSE, this.handleResponse);
        socketService.off(EVENTS.LLM_CHAT_STREAM_CHUNK_RESPONSE, this.handleStreamChunk);
    }
}

/**
 * Service for managing multiple conversation sessions
 */
export class ConversationService {
    private sessions: Map<string, ConversationManager> = new Map();

    /**
     * Create or get a conversation session
     */
    getSession(conversationId: string, modelId: string, systemPrompt?: string): ConversationManager {
        if (!this.sessions.has(conversationId)) {
            const session = new ConversationManager(conversationId, modelId, systemPrompt);
            this.sessions.set(conversationId, session);
        }
        return this.sessions.get(conversationId)!;
    }

    /**
     * Get all active sessions
     */
    getAllSessions(): Map<string, ConversationManager> {
        return this.sessions;
    }

    /**
     * Remove a session
     */
    removeSession(conversationId: string): void {
        const session = this.sessions.get(conversationId);
        if (session) {
            session.cleanup();
            this.sessions.delete(conversationId);
        }
    }

    /**
     * Abort all requests across all sessions
     */
    async abortAllRequests(): Promise<void> {
        const promises = Array.from(this.sessions.values()).map(session => session.abortRequests());
        await Promise.all(promises);
    }
}

// Export singleton instance
export const conversationService = new ConversationService();