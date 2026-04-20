/**
 * @module Utils/TokenCount
 *
 * Provides token counting utilities for estimating the number of tokens in text.
 * This is useful for helping users understand the approximate length of their input
 * when working with language models.
 */

/**
 * Estimates the number of tokens in a text string using a simple approximation.
 * 
 * This function uses a heuristic approach that approximates the tokenization used by
 * most modern language models (GPT-3/4, Claude, etc.). The estimation is based on:
 * - Average word length and common tokenization patterns
 * - Punctuation and special character handling
 * - Whitespace normalization
 *
 * @param text - The input text to count tokens for
 * @returns The estimated number of tokens
 */
export const estimateTokenCount = (text: string): number => {
  if (!text || text.trim().length === 0) {
    return 0;
  }

  // Normalize whitespace and remove extra spaces
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  
  // Split into words and filter out empty strings
  const words = normalizedText.split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return 0;
  }

  // Token estimation logic
  let tokenCount = 0;
  
  for (const word of words) {
    // Handle different word types
    if (word.length <= 3) {
      // Short words typically = 1 token
      tokenCount += 1;
    } else if (word.length <= 6) {
      // Medium words typically = 1-2 tokens
      tokenCount += 1.3;
    } else if (word.length <= 10) {
      // Longer words typically = 2-3 tokens
      tokenCount += 2;
    } else {
      // Very long words (medical terms, compounds) = 3+ tokens
      tokenCount += Math.ceil(word.length / 4);
    }
    
    // Add extra tokens for punctuation within words
    const punctuationCount = (word.match(/[.,!?;:'"()-]/g) || []).length;
    tokenCount += punctuationCount * 0.2;
  }
  
  // Round to nearest integer
  return Math.round(tokenCount);
};