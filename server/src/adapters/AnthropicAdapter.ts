/**
 * @module Adapters.AnthropicAdapter
 *
 * This module provides integration with the Anthropic API for accessing
 * Claude language models. It implements the abstract LLMAdapter interface
 * for standardized communication with Anthropic's models.
 *
 * Features include:
 * - Chat completions and streaming chat completions with cancellation support
 * - Model discovery
 * - Availability checks with proper timeout handling
 * - Request queuing for concurrency control
 * - Automatic API key loading from environment variables
 */

// External dependencies
import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/messages";

// Internal dependencies
import { IChatRoleMessage, IModelOptions } from "../interfaces";
import { LLMAdapter } from "./abstractLLMAdapter";
import log from "../logger";
import { KeyManager } from "../utils";

// Constants
const DEFAULT_ANTHROPIC_BASEURL: string = "https://api.anthropic.com";


/**
 * Adapter for Anthropic Claude language models.
 *
 * @class AnthropicAdapter
 * @extends LLMAdapter
 */
export class AnthropicAdapter extends LLMAdapter {
  /** Anthropic client instance */
  private anthropic: Anthropic;

  /**
   * Creates a new AnthropicAdapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL of the Anthropic API
   * @param apiKey - Optional API key for authentication (falls back to ANTHROPIC_API_KEY env variable)
   * @param maxConcurrentRequests - Maximum number of concurrent requests (0 for unlimited)
   * @throws Error if no API key is found
   */
  constructor(
    adapterID: string,
    baseUrl: string = DEFAULT_ANTHROPIC_BASEURL,
    apiKey?: string,
    maxConcurrentRequests: number = 1
  ) {
    // Resolve and validate the API key
    const resolvedKey = KeyManager.resolveApiKey(
      adapterID,
      apiKey,
      "ANTHROPIC_API_KEY"
    );

    // Validate the resolved API key
    const validatedKey = KeyManager.validateKeyOrThrow(
      adapterID,
      resolvedKey,
      "ANTHROPIC_API_KEY"
    );
    super(adapterID, baseUrl, "anthropic", validatedKey, maxConcurrentRequests);
    this.apiKey = validatedKey;
    this.anthropic = new Anthropic({ 
      apiKey: validatedKey, 
      baseURL: baseUrl
    });
  }

  /**
   * Generates embeddings for the provided texts using the specified model.
   * Note: Anthropic does not currently provide embedding models through their API.
   *
   * @param model - The model to use for generating embeddings
   * @param texts - Array of text strings to embed
   * @param timeout - Maximum time in milliseconds before the request is aborted
   * @returns 2D array of embedding vectors
   * @throws Error indicating embeddings are not supported
   */
  async getEmbeddings(
    _model: string,
    _texts: string[],
    _timeout: number
  ): Promise<number[][]> {
    throw new Error("Anthropic does not support embeddings through their API");
  }

  /**
   * Filters model options to only include parameters supported by Anthropic API.
   * Anthropic supports: temperature (0-1.0) OR top_p (not both).
   * Does NOT support: presence_penalty, frequency_penalty, seed, stream.
   *
   * @param options - Original model options (may have undefined values)
   * @returns Filtered options containing only Anthropic-supported parameters
   */
  private filterAnthropicOptions(options: Partial<IModelOptions>): Partial<IModelOptions> {
    const filteredOptions: Partial<IModelOptions> = {};

    // Prefer temperature over top_p if both provided
    if (options.temperature !== undefined) {
      // Clamp to Anthropic's range: 0-1.0 (not 0-2.0)
      filteredOptions.temperature = Math.max(0, Math.min(1, options.temperature));
    } else if (options.top_p !== undefined) {
      filteredOptions.top_p = options.top_p;
    }

    return filteredOptions;
  }

  /**
   * Converts IChatRoleMessage format to Anthropic MessageParam format.
   * Handles system messages by extracting them separately as required by Anthropic API.
   *
   * @param messages - Array of chat messages in IChatRoleMessage format
   * @returns Object containing system message (if any) and converted messages
   */
  private convertMessages(messages: IChatRoleMessage[]): {
    system?: string;
    messages: MessageParam[];
  } {
    let system: string | undefined;
    const convertedMessages: MessageParam[] = [];

    for (const message of messages) {
      if (message.role === "system") {
        // Anthropic API expects system messages to be passed separately
        system = message.content;
      } else if (message.role === "user" || message.role === "assistant") {
        convertedMessages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return { system, messages: convertedMessages };
  }

  /**
   * Forwards a chat request to the Anthropic API with optional streaming support.
   *
   * @param model - The Anthropic model identifier to use (e.g., "claude-3-sonnet-20240229")
   * @param messages - Array of conversation messages with roles and content
   * @param options - Model options (temperature, max_tokens, etc.)
   * @param signal - AbortSignal for cancellation support
   * @param requestID - Unique identifier for tracking this request in the queue
   * @param onChunk - Optional callback for streaming chunks. If provided, enables streaming mode.
   * @returns A Promise resolving to the complete text response from the model
   * @throws Error if the request fails, is aborted, or returns invalid data
   */
  async forwardRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: IModelOptions,
    signal: AbortSignal,
    requestID: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    return this.requestQueue.add(async () => {
      try {
        const { system, messages: convertedMessages } = this.convertMessages(messages);
        // Filter to Anthropic-supported parameters (also removes undefined)
        const filteredOptions = this.filterAnthropicOptions(options);

        if (onChunk) {
          return await this.handleStreamingRequest(model, convertedMessages, system, filteredOptions, signal, onChunk);
        } else {
          return await this.handleNonStreamingRequest(model, convertedMessages, system, filteredOptions, signal);
        }
      } catch (error) {
        return this.handleRequestError(error);
      }
    }, requestID);
  }

  /**
   * Handles non-streaming Anthropic API requests.
   */
  private async handleNonStreamingRequest(
    model: string,
    messages: MessageParam[],
    system: string | undefined,
    options: Partial<IModelOptions>,
    signal: AbortSignal
  ): Promise<string> {
    const response = await this.anthropic.messages.create(
      {
        model: model,
        messages: messages,
        system: system,
        max_tokens: 4096,
        ...options,
      },
      { signal }
    );

    const textContent = (response as any).content
      .filter((content: any) => content.type === "text")
      .map((content: any) => content.text)
      .join("");

    if (!textContent) {
      throw new Error("Response of assistant is empty");
    }

    return textContent.trim();
  }

  /**
   * Handles streaming Anthropic API requests using the official SDK.
   */
  private async handleStreamingRequest(
    model: string,
    messages: MessageParam[],
    system: string | undefined,
    options: Partial<IModelOptions>,
    signal: AbortSignal,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let fullResponse = "";

    if (signal.aborted) {
      throw new DOMException("Request aborted", "AbortError");
    }

    const messageStream = this.anthropic.messages.stream(
      {
        model: model,
        messages: messages,
        system: system,
        max_tokens: 4096,
        ...options,
      },
      { signal }
    );

    for await (const chunk of messageStream) {
      if (signal.aborted) {
        throw new DOMException("Request aborted", "AbortError");
      }

      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        const content = chunk.delta.text;
        
        if (content) {
          fullResponse += content;
          await new Promise((resolve) => setTimeout(resolve, 10));
          onChunk(content);
        }
      }
    }

    return fullResponse;
  }

  /**
   * Handles request errors with consistent error formatting.
   */
  private handleRequestError(error: unknown): never {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      (error instanceof Error && error.name === "AbortError") ||
      errorMessage === "Request was aborted."
    ) {
      log.debug(`Request aborted in Anthropic API: ${errorMessage}`, "AnthropicAdapter");
      throw new Error(`Server/AnthropicAdapter: Request aborted`);
    } else {
      // Enhanced debug logging for connection failures
      log.debug(`Anthropic connection failed - URL: ${this.baseUrl} | API Key: ${this.apiKey ? 'configured' : 'missing'} | Error: ${error instanceof Error ? error.name : 'Unknown'} - ${errorMessage}`, "AnthropicAdapter");
      
      // Diagnose common connection issues
      if (errorMessage.includes('ECONNREFUSED')) {
        log.debug(`Diagnosis: Connection refused - server unreachable`, "AnthropicAdapter");
      } else if (errorMessage.includes('ENOTFOUND')) {
        log.debug(`Diagnosis: DNS resolution failed - check hostname`, "AnthropicAdapter");
      } else if (errorMessage.includes('401')) {
        log.debug(`Diagnosis: Authentication failed - invalid API key`, "AnthropicAdapter");
      } else if (errorMessage.includes('429')) {
        log.debug(`Diagnosis: Rate limited`, "AnthropicAdapter");
      } else if (errorMessage.includes('50')) {
        log.debug(`Diagnosis: Server error - service unavailable`, "AnthropicAdapter");
      }
      
      log.error(`Error communicating with Anthropic API: ${errorMessage}`, "AnthropicAdapter");
      throw new Error(`Server/AnthropicAdapter: ${errorMessage}`);
    }
  }

  /**
   * Lists all available models from the Anthropic API.
   * Uses the Anthropic SDK to dynamically fetch the current list of available models.
   *
   * @returns Array of model IDs available through the Anthropic API
   */
  async listModels(): Promise<string[]> {
    try {
      // Use the Anthropic SDK to get current available models
      const response = await this.anthropic.models.list();
      
      // Extract model IDs from the response
      if (response.data && Array.isArray(response.data)) {
        const modelIds = response.data.map((model: any) => model.id).filter(Boolean);
        log.debug(`Retrieved ${modelIds.length} models from Anthropic API`, "AnthropicAdapter");
        return modelIds;
      }
      
      throw new Error("Invalid response format from models endpoint");
    } catch (error) {
      log.error(
        `Error fetching models from Anthropic API: ${error}`,
        "AnthropicAdapter"
      );
      return [];
    }
  }

  /**
   * Checks if the Anthropic API is available and responding.
   *
   * @returns True if the API is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a short timeout for availability check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Try a simple message as a health check using the fastest model
        await this.anthropic.messages.create(
          {
            model: "claude-3-haiku-20240307", // Use Haiku for fastest health check
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 10,
          },
          { signal: controller.signal }
        );
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.debug(`Anthropic availability check failed - URL: ${this.baseUrl} | API Key: ${this.apiKey ? 'configured' : 'missing'} | Error: ${errorMessage}`, "AnthropicAdapter");
        return false;
      } finally {
        // Clean up the timeout
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.debug(`Anthropic API not available: ${errorMessage}`, "AnthropicAdapter");
      return false;
    }
  }
}

export default AnthropicAdapter;