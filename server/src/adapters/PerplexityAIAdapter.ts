/**
 * @module Adapters.PerplexityAIAdapter
 *
 * This module provides integration with the Perplexity AI API for accessing
 * cloud-hosted language models. It implements the abstract LLMAdapter interface
 * for standardized communication with Perplexity AI's models.
 *
 * Note: As of March 2024, Perplexity AI may not have a dedicated models endpoint.
 * This implementation uses a placeholder approach for listing available models.
 * Also, Perplexity AI does not support embeddings as of March 2024. *
 */

// Internal dependencies
import { IChatRoleMessage, IModelOptions } from "../interfaces";
import { LLMAdapter } from "./abstractLLMAdapter";
import log from "../logger";
import { createCustomFetch, KeyManager } from "../utils";

// Constants
const DEFAULT_PERPLEXITYAI_BASEURL: string = "https://api.perplexity.ai";

/**
 * Adapter for Perplexity AI cloud language models.
 *
 * @class PerplexityAIAdapter
 * @extends LLMAdapter
 */
export class PerplexityAIAdapter extends LLMAdapter {
  /**
   * Creates a new PerplexityAIAdapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL of the Perplexity API
   * @param apiKey - API key required for Perplexity AI
   * @param maxConcurrentRequests - Maximum number of concurrent requests (0 for unlimited)
   */
  constructor(
    adapterID: string,
    baseUrl: string = DEFAULT_PERPLEXITYAI_BASEURL,
    apiKey?: string,
    maxConcurrentRequests: number = 1
  ) {
    // Resolve and validate the API
    const resolvedKey = KeyManager.resolveApiKey(
      adapterID,
      apiKey,
      "PERPLEXITYAI_API_KEY"
    );

    // Validate the resolved API key
    const validatedKey = KeyManager.validateKeyOrThrow(
      adapterID,
      resolvedKey,
      "PERPLEXITYAI_API_KEY"
    );

    super(
      adapterID,
      baseUrl,
      "perplexityai",
      validatedKey,
      maxConcurrentRequests
    );

    this.apiKey = validatedKey;
  }

  /**
   * Lists all available models from the Perplexity AI API.
   *
   * Note: As of March 2024, Perplexity may not have a dedicated models endpoint.
   *
   * @returns Array of model names available on the Perplexity server
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async listModels(): Promise<string[]> {
    try {
      // Perplexity doesn't have a dedicated models endpoint, so we'll return the supported models
      // These could be updated based on Perplexity's documentation
      return [
        "sonar-deep-research",
        "sonar-reasoning-pro",
        "sonar-reasoning",
        "sonar-pro",
        "sonar",
        "r1-1776",
      ];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.error(
        `Failed to get models from Perplexity AI: ${errorMessage}`,
        "PerplexityAIAdapter"
      );
      throw new Error(`Server/PerplexityAIAdapter: ${errorMessage}`);
    }
  }

  /**
   * Checks if the Perplexity AI API is available and responding.
   *
   * @returns True if the API is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a short timeout for availability checks to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        // Make a simple request to check if the API is responsive
        const response = await createCustomFetch(
          controller.signal,
          this.apiKey
        )(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1,
          }),
        });

        // If we get here without an error, the API is available
        return response.ok;
      } finally {
        // Clean up the timeout
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log.debug(
        `PerplexityAI availability check failed - URL: ${this.baseUrl} | API Key: ${this.apiKey ? 'configured' : 'missing'} | Error: ${errorMessage}`,
        "PerplexityAIAdapter"
      );
      return false;
    }
  }

  /**
   * Generates embeddings for the provided texts using the specified model.
   *
   * Note: As of March 2024, Perplexity may not have an embeddings endpoint.
   * This implementation uses a placeholder approach.
   *
   * @param model - The model to use for generating embeddings
   * @param texts - Array of text strings to embed
   * @param timeout - Maximum time in milliseconds before the request is aborted
   * @returns 2D array of embedding vectors
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async getEmbeddings(
    model: string,
    texts: string[],
    timeout: number
  ): Promise<number[][]> {
    try {
      // Set up timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Perplexity doesn't have a dedicated embeddings API as of March 2024
        // This is a placeholder implementation
        throw new Error("Embeddings are not supported by Perplexity AI API");
      } finally {
        // Clean up timeout
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      // Handle abort errors differently from other errors
      if (error instanceof Error && error.name === "AbortError") {
        log.debug(
          `Embedding request aborted in Perplexity AI API: ${error}`,
          "PerplexityAIAdapter"
        );
        throw error;
      } else {
        log.error(
          `Error fetching embeddings from Perplexity AI API: ${error}`,
          "PerplexityAIAdapter"
        );
        throw new Error(`Server/PerplexityAIAdapter Error: ${String(error)}`);
      }
    }
  }

  /**
   * Filters model options to only include parameters supported by Perplexity API.
   * Perplexity supports: temperature (0-2.0), top_p (0-1.0).
   * Presence_penalty: 0-2.0 (must be >= 0).
   * Frequency_penalty: must be > 0 (cannot be 0 or negative).
   * Does NOT support: seed, stream.
   *
   * @param options - Original model options (may have undefined values)
   * @returns Filtered options containing only Perplexity-supported parameters
   */
  private filterPerplexityOptions(options: Partial<IModelOptions>): Partial<IModelOptions> {
    const filteredOptions: Partial<IModelOptions> = {};

    if (options.temperature !== undefined) {
      filteredOptions.temperature = Math.max(0, Math.min(2, options.temperature));
    }

    if (options.top_p !== undefined) {
      filteredOptions.top_p = Math.max(0, Math.min(1, options.top_p));
    }

    // Perplexity requires presence_penalty >= 0 (no negative values)
    if (options.presence_penalty !== undefined && options.presence_penalty >= 0) {
      filteredOptions.presence_penalty = Math.min(2, options.presence_penalty);
    }

    // Perplexity requires frequency_penalty > 0 (must be positive, cannot be 0)
    if (options.frequency_penalty !== undefined && options.frequency_penalty > 0) {
      filteredOptions.frequency_penalty = Math.min(2, options.frequency_penalty);
    }

    return filteredOptions;
  }

  /**
   * Forwards a chat request to the Perplexity AI API with optional streaming support.
   *
   * @param model - The model to use for completion
   * @param messages - Array of messages forming the conversation
   * @param options - Model options for the request
   * @param signal - Signal for cancelling the request
   * @param requestID - Unique identifier for tracking this request
   * @param onChunk - Optional callback for streaming chunks. If provided, enables streaming mode.
   * @returns The model's response text
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
        // Filter to Perplexity-supported parameters (also removes undefined)
        const filteredOptions = this.filterPerplexityOptions(options);

        if (onChunk) {
          return await this.handleStreamingRequest(model, messages, filteredOptions, signal, onChunk);
        } else {
          return await this.handleNonStreamingRequest(model, messages, filteredOptions, signal);
        }
      } catch (error) {
        return this.handleRequestError(error);
      }
    }, requestID);
  }

  /**
   * Handles non-streaming Perplexity AI API requests.
   */
  private async handleNonStreamingRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: Omit<IModelOptions, 'stream'>,
    signal: AbortSignal
  ): Promise<string> {
    const payload = {
      model: model,
      messages: messages,
      stream: false,
      ...options,
    };

    const response = await createCustomFetch(signal, this.apiKey)(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (
      !data ||
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message
    ) {
      throw new Error("Invalid response format from Perplexity AI API");
    }

    return data.choices[0].message.content.trim();
  }

  /**
   * Handles streaming Perplexity AI API requests using fetch for SSE processing.
   */
  private async handleStreamingRequest(
    model: string,
    messages: IChatRoleMessage[],
    options: Omit<IModelOptions, 'stream'>,
    signal: AbortSignal,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let fullResponse = "";

    if (signal.aborted) {
      throw new DOMException("Request aborted", "AbortError");
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: true,
        ...options,
      }),
      signal: signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported in this environment");
    }

    const reader = response.body.getReader();

    if (signal.aborted) {
      reader.cancel();
      throw new DOMException("Request aborted", "AbortError");
    }

    const textDecoder = new TextDecoder();
    let buffer = "";

    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += textDecoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsedData = JSON.parse(data);
            const content = parsedData.choices?.[0]?.delta?.content || "";

            if (content) {
              if (signal.aborted) {
                await reader.cancel();
                throw new DOMException("Request aborted", "AbortError");
              }

              fullResponse += content;
              onChunk(content);
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              throw error;
            }
            log.debug(`Error parsing JSON response: ${error}`, "PerplexityAIAdapter");
          }
        }
      }
    }

    return fullResponse;
  }

  /**
   * Handles request errors with consistent error formatting.
   */
  private handleRequestError(error: unknown): never {
    if (error instanceof Error && error.name === "AbortError") {
      log.debug(`Request aborted in Perplexity AI API: ${error}`, "PerplexityAIAdapter");
      throw error;
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced debug logging for connection failures
      log.debug(`PerplexityAI connection failed - URL: ${this.baseUrl} | API Key: ${this.apiKey ? 'configured' : 'missing'} | Error: ${error instanceof Error ? error.name : 'Unknown'} - ${errorMessage}`, "PerplexityAIAdapter");
      
      // Diagnose common connection issues
      if (errorMessage.includes('ECONNREFUSED')) {
        log.debug(`Diagnosis: Connection refused - server unreachable`, "PerplexityAIAdapter");
      } else if (errorMessage.includes('ENOTFOUND')) {
        log.debug(`Diagnosis: DNS resolution failed - check hostname`, "PerplexityAIAdapter");
      } else if (errorMessage.includes('401')) {
        log.debug(`Diagnosis: Authentication failed - invalid API key`, "PerplexityAIAdapter");
      } else if (errorMessage.includes('429')) {
        log.debug(`Diagnosis: Rate limited`, "PerplexityAIAdapter");
      } else if (errorMessage.includes('50')) {
        log.debug(`Diagnosis: Server error - service unavailable`, "PerplexityAIAdapter");
      }
      
      log.error(`Error communicating with Perplexity AI API: ${error}`, "PerplexityAIAdapter");
      throw new Error(`Server/PerplexityAIAdapter Error: ${String(error)}`);
    }
  }
}

export default PerplexityAIAdapter;
