/**
 * @module Interfaces.IModelInfo
 *
 * This module defines the interface and validation schema for model information.
 * It provides a standardized structure for identifying and accessing language models
 * across different providers and adapters in the system.
 */

// External dependencies
import { z } from "zod";

/**
 * Interface representing information about a language model.
 * Contains all necessary details to identify and use a specific model
 * through its corresponding adapter.
 */
export interface IModelInfo {
  /** Unique identifier for the model in the format "adapterID-modelName" */
  id: string;

  /** Native name of the model as provided by its service */
  model: string;

  /** Base URL of the API endpoint for this model */
  baseUrl: string;

  /** Provider identifier (e.g., "openai", "ollama") */
  provider: string;

  /** ID of the adapter responsible for communicating with this model */
  adapterID: string;
}

/**
 * Zod schema for validating model information objects.
 * Ensures all properties conform to expected types.
 */
export const ModelInfoSchema = z.object({
  id: z.string(),
  model: z.string(),
  baseUrl: z.string(),
  provider: z.string(),
  adapterID: z.string(),
});
