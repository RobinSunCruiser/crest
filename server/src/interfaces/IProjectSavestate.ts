/**
 * @module Interfaces.IProjectSavestate
 *
 * This module defines interfaces and validation schemas for project save states.
 * It provides structures for storing and validating multi-model conversations,
 * custom messages, and project configuration options.
 */

// External dependencies
import { z } from "zod";

// Internal dependencies
import { IChatRoleMessage, ChatRoleMessageSchema } from "./IChatRoleMessage";
import { IModelInfo, ModelInfoSchema } from "./IModelInfo";
import { IModelOptions, ModelOptionsSchema } from "./IModelOptions";

/**
 * Interface representing a custom message template.
 * Custom messages allow users to save and reuse message templates.
 */
export interface ICustomMessage {
  /** Display name for this message template */
  label: string;

  /** Content of the message template */
  message: string;

  /** Indicates if this template has been used in the project */
  used: boolean;

  /** Indicates if this template has been modified from its original state */
  edited: boolean;
}

/**
 * Zod schema for validating custom message objects.
 */
export const CustomMessageSchema = z.object({
  label: z.string(),
  message: z.string(),
  used: z.boolean(),
  edited: z.boolean(),
});

/**
 * Interface representing project-wide configuration options.
 * These settings apply to all models in the project.
 */
export interface IProjectOptions {
  /** Maximum time (in ms) to wait for model responses */
  timeout: number;

  /** Whether to render messages with Markdown formatting */
  markdown: boolean;

  /** System prompt to use for all conversations */
  systemPrompt: string;

  /** Whether to extract and display thinking blocks from model responses */
  parseThinkingBlock: boolean;

  /** Optional model settings */
  modelOptions: IModelOptions;
}

/**
 * Zod schema for validating project options objects.
 */
export const ProjectOptionsSchema = z.object({
  timeout: z.number(),
  markdown: z.boolean(),
  systemPrompt: z.string(),
  parseThinkingBlock: z.boolean(),
  modelOptions: ModelOptionsSchema,
});

/**
 * Interface representing the complete state of a project.
 * Contains all model conversations, custom messages, and project options.
 */
export interface IProjectSavestate {
  /** Array of model-specific conversations and settings */
  models: {
    /** Unique identifier for this model instance */
    modelID: string;

    /** Detailed information about the model */
    modelInfo: IModelInfo;

    /** Message history for this model */
    messages: IChatRoleMessage[];
  }[];

  /** Collection of custom message templates */
  customMessages: ICustomMessage[];

  /** Project-wide configuration options */
  options: IProjectOptions;
}

/**
 * Zod schema for validating complete project save state objects.
 */
export const ProjectSavestateSchema = z.object({
  models: z.array(
    z.object({
      modelID: z.string(),
      modelInfo: ModelInfoSchema,
      messages: z.array(ChatRoleMessageSchema),
      temperature: z.number().optional(),
      top_p: z.number().optional(),
      seed: z.number().optional(),
      presence_penalty: z.number().optional(),
      frequency_penalty: z.number().optional(),
    })
  ),
  customMessages: z.array(CustomMessageSchema),
  options: ProjectOptionsSchema,
});
