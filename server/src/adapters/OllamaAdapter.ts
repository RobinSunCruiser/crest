/**
 * @module Adapters.OllamaAdapter
 *
 * This module provides integration with Ollama, a local LLM runtime.
 * It implements the abstract LLMAdapter interface for standardized
 * communication with locally-hosted language models through the Ollama API.
 *
 * Features include:
 * - Chat completions and streaming chat completions with cancellation support
 * - Embeddings generation
 * - Model discovery
 * - Availability checks with proper timeout handling
 * - Request queuing for concurrency control
 */

// External dependencies
import { Ollama } from "ollama";

// Internal dependencies
import { IChatRoleMessage, IModelOptions } from "../interfaces";
import { LLMAdapter } from "./abstractLLMAdapter";
import log from "../logger";
import { createCustomFetch, KeyManager } from "../utils";

// Constants
const DEFAULT_OLLAMA_BASEURL: string = "http://0.0.0.0:11434";

/**
 * Adapter for Ollama-powered local language models.
 *
 * @class OllamaAdapter
 * @extends LLMAdapter
 */
export class OllamaAdapter extends LLMAdapter {
  /**
   * Creates a new OllamaAdapter instance.
   *
   * @param adapterID - Identifier for the adapter instance
   * @param baseUrl - The base URL of the Ollama API
   * @param apiKey - Optional API key for authenticated Ollama deployments (falls back to {ADAPTER_ID}_API_KEY env variable)
   * @param maxConcurrentRequests - Maximum number of concurrent requests (0 for unlimited)
   */
  constructor(
    adapterID: string,
    baseUrl: string = DEFAULT_OLLAMA_BASEURL,
    apiKey?: string,
    maxConcurrentRequests: number = 1
  ) {
    // Resolve API key (optional for Ollama - no validation error if not found)
    // Use adapter-specific environment variable (e.g., LOCAL_API_KEY, GRAY_API_KEY, LUEBECK_API_KEY)
    const envVarName = `${adapterID.toUpperCase()}_API_KEY`;
    const resolvedKey = KeyManager.resolveApiKey(
      adapterID,
      apiKey,
      envVarName
    );

    super(adapterID, baseUrl, "ollama", resolvedKey ?? undefined, maxConcurrentRequests);
  }

  /**
   * Creates an Ollama client instance with abort signal support.
   *
   * @private
   * @param signal - Optional abort signal to cancel requests
   * @returns An Ollama client instance with signal support
   */
  private _createOllamaWithSignal(signal?: AbortSignal): Ollama {
    const config: any = {
      host: this.baseUrl,
      fetch: createCustomFetch(signal),
    };

    // Add Authorization header if API key is provided
    if (this.apiKey) {
      config.headers = {
        Authorization: `Bearer ${this.apiKey}`,
      };
    }

    return new Ollama(config);
  }

  /**
   * Lists all available models from the Ollama API.
   *
   * @returns Array of model names available on the Ollama server
   * @throws Error if the request fails, times out, or returns invalid data
   */
  async listModels(): Promise<string[]> {
    try {
      // Create an abort controller for timeout enforcement
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 10 second timeout

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Fetch model list from the Ollama API
        const response = await ollama.list();

        // Validate response structure to ensure it contains models
        if (!response || !Array.isArray(response.models)) {
          throw new Error("Invalid response format from Ollama API");
        }

        // Extract and validate model names from the response
        const modelNames = response.models
          .filter((model: any) => model && typeof model.name === "string")
          .map((model: any) => model.name);

        log.debug(`Retrieved ${modelNames.length} models from Ollama API`, "OllamaAdapter");
        return modelNames;
      } finally {
        // Always clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Categorize errors for better diagnostics
      if (error instanceof Error && error.name === "AbortError") {
        log.error(
          `Timeout while fetching models from Ollama API`,
          "OllamaAdapter"
        );
        throw new Error(`Server/OllamaAdapter: Request timed out`);
      } else {
        log.error(
          `Failed to fetch models from Ollama API: ${errorMessage}`,
          "OllamaAdapter"
        );
        throw new Error(`Server/OllamaAdapter: ${errorMessage}`);
      }
    }
  }

  /**
   * Checks if the Ollama API is available and responding.
   *
   * @returns True if the API is available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Use a short timeout for availability checks to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Try listing models as a simple health check
        await ollama.list();
        return true; // If we get here, the API is available
      } finally {
        // Clean up the timeout
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Log availability issues at debug level since they may be expected
      log.debug(`Ollama availability check failed - URL: ${this.baseUrl} | Error: ${errorMessage}`, "OllamaAdapter");
      return false;
    }
  }

  /**
   * Generates embeddings for the provided texts using the specified model.
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
    const embeddings: number[][] = [];
    try {
      // Set up timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Create Ollama instance with the abort signal
      const ollama = this._createOllamaWithSignal(controller.signal);

      try {
        // Process each text separately to get embeddings
        for (const text of texts) {
          // Check for abortion before each request to fail fast
          if (controller.signal.aborted) {
            throw new DOMException(
              "TimeoutError",
              `Request timed out after ${timeout} ms`
            );
          }

          // Get embeddings for the current text
          const response = await ollama.embeddings({
            model: model,
            prompt: text,
          });

          // Validate and store the embeddings
          if (response && Array.isArray(response.embedding)) {
            embeddings.push(response.embedding);
          } else {
            throw new Error("Invalid embedding response from Ollama API");
          }
        }

        return embeddings;
      } finally {
        // Clean up timeout
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      // Handle abort errors differently from other errors
      if (error instanceof Error && error.name === "AbortError") {
        log.debug(
          `Embedding request aborted in Ollama API: ${error}`,
          "OllamaAdapter"
        );
        throw error;
      } else {
        log.error(
          `Error fetching embeddings from Ollama API: ${error}`,
          "OllamaAdapter"
        );
        throw new Error(`Server/OllamaAdapter Error: ${String(error)}`);
      }
    }
  }

  /**
   * Filters model options to remove undefined values.
   * Ollama supports all parameters, but we only send defined ones to let API use its defaults.
   *
   * @param options - Original model options (may have undefined values)
   * @returns Filtered options with undefined values removed
   */
  private filterOllamaOptions(options: Partial<IModelOptions>): Partial<IModelOptions> {
    const filteredOptions: Partial<IModelOptions> = {};

    // Only include defined values, let Ollama use defaults for undefined
    if (options.temperature !== undefined) filteredOptions.temperature = options.temperature;
    if (options.top_p !== undefined) filteredOptions.top_p = options.top_p;
    if (options.presence_penalty !== undefined) filteredOptions.presence_penalty = options.presence_penalty;
    if (options.frequency_penalty !== undefined) filteredOptions.frequency_penalty = options.frequency_penalty;
    if (options.seed !== undefined) filteredOptions.seed = options.seed;

    return filteredOptions;
  }

  /**
   * Forwards a chat request to the Ollama API with optional streaming support.
   *
   * @param model - The Ollama model identifier to use (e.g., "llama2", "mistral")
   * @param messages - Array of conversation messages with roles and content
   * @param options - Model-specific options for the request
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
        // Filter to remove undefined values (Ollama uses its defaults)
        const filteredOptions = this.filterOllamaOptions(options);
        const ollama = this._createOllamaWithSignal(signal);

        if (onChunk) {
          return await this.handleStreamingRequest(ollama, model, messages, filteredOptions, signal, onChunk);
        } else {
          return await this.handleNonStreamingRequest(ollama, model, messages, filteredOptions);
        }
      } catch (error) {
        return this.handleRequestError(error);
      }
    }, requestID);
  }

  /**
   * Handles non-streaming Ollama API requests.
   */
  private async handleNonStreamingRequest(
    ollama: any,
    model: string,
    messages: IChatRoleMessage[],
    options: Partial<IModelOptions>
  ): Promise<string> {
    const response = await ollama.chat({
      model: model,
      messages: messages,
      stream: false,
      options: {
        ...options,
      },
    });

    return response.message.content.trim();
  }

  /**
   * Handles streaming Ollama API requests using native streaming capabilities.
   */
  private async handleStreamingRequest(
    ollama: any,
    model: string,
    messages: IChatRoleMessage[],
    options: Partial<IModelOptions>,
    signal: AbortSignal,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    let fullResponse = "";

    if (signal.aborted) {
      throw new DOMException("Request aborted", "AbortError");
    }

    const response = await ollama.chat({
      model: model,
      messages: messages,
      stream: true,
      options: {
        ...options,
      },
    });

    for await (const partialResponse of response) {
      if (signal.aborted) {
        throw new DOMException("Request aborted", "AbortError");
      }

      const chunk = partialResponse.message.content;
      onChunk(chunk);
      fullResponse += chunk;

      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    return fullResponse;
  }

  /**
   * Handles request errors with consistent error formatting.
   */
  private handleRequestError(error: unknown): never {
    if (error instanceof Error && error.name === "AbortError") {
      log.debug(`Request aborted in Ollama API: ${error}`, "OllamaAdapter");
      throw error;
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Enhanced debug logging for connection failures
      log.debug(`Ollama connection failed - URL: ${this.baseUrl} | Error: ${error instanceof Error ? error.name : 'Unknown'} - ${errorMessage}`, "OllamaAdapter");
      
      // Diagnose common connection issues
      if (errorMessage.includes('ECONNREFUSED')) {
        log.debug(`Diagnosis: Connection refused - Ollama server not running or unreachable`, "OllamaAdapter");
      } else if (errorMessage.includes('ENOTFOUND')) {
        log.debug(`Diagnosis: DNS resolution failed - check hostname/IP`, "OllamaAdapter");
      } else if (errorMessage.includes('ETIMEDOUT')) {
        log.debug(`Diagnosis: Connection timeout - server may be overloaded`, "OllamaAdapter");
      } else if (errorMessage.includes('404')) {
        log.debug(`Diagnosis: Model not found - check model availability`, "OllamaAdapter");
      } else if (errorMessage.includes('50')) {
        log.debug(`Diagnosis: Server error - Ollama service issue`, "OllamaAdapter");
      }
      
      log.error(`Error communicating with Ollama API: ${error}`, "OllamaAdapter");
      throw new Error(`Server/OllamaAdapter Error: ${String(error)}`);
    }
  }
}

export default OllamaAdapter;
