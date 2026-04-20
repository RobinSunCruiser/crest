/**
 * @module Utils.Strings
 *
 * This module provides utility functions for string manipulation,
 * JSON extraction, date formatting, and special markup processing.
 *
 * The functions handle common string-related tasks used throughout the application,
 * particularly for processing model outputs and formatting data.
 */

//=============================================================================
// TEXT FORMATTING UTILITIES
//=============================================================================

/**
 * Capitalizes the first letter of a given string.
 *
 * @param input - The string to capitalize
 * @returns The input string with the first letter capitalized
 *
 * @example
 * const result = capitalizeFirstLetter('hello');
 * console.log(result); // 'Hello'
 */
export const capitalizeFirstLetter = (input: string): string => {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
};

//=============================================================================
// JSON HANDLING UTILITIES
//=============================================================================

/**
 * Extracts the first valid JSON string found within a message.
 *
 * @param message - The string that may contain a JSON object
 * @returns The first valid JSON string found or "{}" if none is found
 *
 * @example
 * const jsonString = getValidJSONString('Here is a JSON: {"key": "value"}');
 * console.log(jsonString); // '{"key": "value"}'
 */
export const getValidJSONString = (message: string): string => {
  try {
    // Match patterns that look like JSON objects, handling nested structures
    const regex: RegExp = /({(?:[^{}]|{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*})*})/s;
    const jsonString = message.match(regex)?.[0];

    if (!jsonString) {
      throw new Error("Could not find valid JSON object in message");
    } else {
      return jsonString;
    }
  } catch (error) {
    console.error(error + " Message: " + message);
    return "{}";
  }
};

//=============================================================================
// DATE FORMATTING UTILITIES
//=============================================================================

/**
 * Generates a simple date format string representing the current date and time.
 *
 * @returns A string in the format `YYYY-MM-DD-HHMMSS`
 *
 * @example
 * const timestamp = simpleDateFormat();
 * console.log(timestamp); // e.g., '2024-05-25-153045'
 */
export const simpleDateFormat = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
};

//=============================================================================
// THINKING BLOCK PROCESSING
//=============================================================================

/**
 * Removes the `<think> ... </think>` block from a given string.
 *
 * @param message - The string that may contain a `<think>` block
 * @returns The input string with the `<think>` block removed
 */
export const removeThinkingBlock = (message: string): string => {
  // Match content between <think> tags, including newlines (s flag)
  const thinkBlockRegex = /<think>(.*?)<\/think>/s;
  const thinkBlockMatch = message.match(thinkBlockRegex);

  if (!thinkBlockMatch) {
    return message;
  }

  return message.replace(thinkBlockMatch[0], "").trim();
};

/**
 * Checks if a given string contains a `<think>` block.
 *
 * @param message - The string to check for `<think>` blocks
 * @returns `true` if the message contains a `<think>` block
 */
export const checkForThinkingBlock = (message: string): boolean => {
  const thinkBlockRegex = /<think>(.*?)<\/think>/s;
  return thinkBlockRegex.test(message);
};

/**
 * Separates the content inside `<think>` tags from the rest of the message.
 *
 * @param message - The string that may contain a `<think>` block
 * @returns Object with extracted thinking content and the remaining message
 *
 * @example
 * const result = splitThinkingContent('Hello, <think>I am thinking</think> world');
 * // result = { thinkingContent: 'I am thinking', remainingMessage: 'Hello, world' }
 */
export const splitThinkingContent = (
  message: string
): { thinkingContent: string | null; remainingMessage: string } => {
  const thinkBlockRegex = /<think>(.*?)<\/think>/s;
  const thinkBlockMatch = message.match(thinkBlockRegex);

  if (!thinkBlockMatch) {
    return { thinkingContent: null, remainingMessage: message };
  }

  return {
    thinkingContent: thinkBlockMatch[1].trim(),
    remainingMessage: message.replace(thinkBlockMatch[0], "").trim(),
  };
};
