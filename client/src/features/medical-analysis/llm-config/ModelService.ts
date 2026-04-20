/**
 * @module Services/ModelService
 *
 * Domain service for managing LLM models.
 * Handles model discovery, listing, and metadata.
 * 
 * Responsibilities:
 * - Model listing and discovery
 * - Model metadata management  
 * - Model availability tracking
 */

import { v4 as uuidv4 } from 'uuid';
import { socketService } from '@/shared/services';
import { IModelInfo } from '@root/server/src/interfaces/IModelInfo';
import {
    EVENTS,
    LLMListMessage,
    LLMListUpdateMessage,
    TimeoutError,
} from '@root/server/src/socket/apiObjects';

const TIMEOUT = 30000;

/**
 * Service for managing LLM models
 */
export class ModelService {
    private models: IModelInfo[] = [];
    private modelUpdateCallbacks: ((models: IModelInfo[]) => void)[] = [];
    private pendingListRequests: Map<string, { resolve: (models: IModelInfo[]) => void; reject: (error: Error) => void }> = new Map();
    private abortedListRequests: Set<string> = new Set();

    constructor() {
        this.setupSocketListeners();
    }

    private setupSocketListeners(): void {
        socketService.on(EVENTS.LLM_LIST_UPDATE, this.handleModelListUpdate);
    }

    private handleModelListUpdate = (message: LLMListUpdateMessage): void => {
        // Handle global model updates (no requestID in payload)
        if (!message.payload) {
            this.models = message.data.models;
            this.notifyModelUpdate();
            return;
        }

        // Handle specific request responses
        const { requestID } = message.payload;

        if (this.abortedListRequests.has(requestID)) {
            this.pendingListRequests.delete(requestID);
            this.abortedListRequests.delete(requestID);
            return;
        }

        const pendingRequest = this.pendingListRequests.get(requestID);
        if (!pendingRequest) return;

        const { resolve, reject } = pendingRequest;
        this.pendingListRequests.delete(requestID);

        if (message.error) {
            const errorMessage = typeof message.error === 'string' 
                ? message.error 
                : message.error instanceof Error 
                    ? message.error.message 
                    : 'Unknown error occurred';
            reject(new Error(errorMessage));
            return;
        }

        this.models = message.data.models;
        this.notifyModelUpdate();
        resolve(message.data.models);
    };

    /**
     * Request list of available models
     */
    async listModels(timeout: number = TIMEOUT): Promise<IModelInfo[]> {
        const requestID = uuidv4();

        const socketMessage: LLMListMessage = {
            event: EVENTS.LLM_LIST_REQUEST,
            version: '0.1.0',
            payload: { requestID },
        };

        socketService.send(socketMessage);

        return new Promise((resolve, reject) => {
            this.pendingListRequests.set(requestID, { resolve, reject });
            
            setTimeout(() => {
                this.pendingListRequests.delete(requestID);
                reject(new TimeoutError(`Model list request timed out after ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Get current model list
     */
    getModels(): IModelInfo[] {
        return [...this.models];
    }

    /**
     * Find model by ID
     */
    getModel(modelId: string): IModelInfo | undefined {
        return this.models.find(model => model.id === modelId);
    }

    /**
     * Check if model is available
     */
    isModelAvailable(modelId: string): boolean {
        return this.models.some(model => model.id === modelId);
    }

    /**
     * Get models by provider
     */
    getModelsByProvider(provider: string): IModelInfo[] {
        return this.models.filter(model => model.provider === provider);
    }

    /**
     * Add model update callback
     */
    addOnModelUpdate(callback: (models: IModelInfo[]) => void): void {
        this.modelUpdateCallbacks.push(callback);
    }

    /**
     * Remove model update callback
     */
    removeOnModelUpdate(callback: (models: IModelInfo[]) => void): void {
        this.modelUpdateCallbacks = this.modelUpdateCallbacks.filter(cb => cb !== callback);
    }

    private notifyModelUpdate(): void {
        this.modelUpdateCallbacks.forEach(callback => callback([...this.models]));
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        socketService.off(EVENTS.LLM_LIST_UPDATE, this.handleModelListUpdate);
    }
}

// Export singleton instance
export const modelService = new ModelService();