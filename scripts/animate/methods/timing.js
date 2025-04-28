/**
 * Machine Yearning Animation Controller - Timing Methods
 * Contains methods for calculating animation timing
 */

// Default animation settings in case settings module is not available
const DEFAULT_ANIMATION_SETTINGS = {
  enabled: true,
  wordsPerMinute: 200,
  minTypingTime: 800,
  maxTypingTime: 6000,
  variancePercentage: 15,
  typingAppliesTo: "both"
};

// Default read delay settings
const DEFAULT_READ_DELAY_SETTINGS = {
  enabled: true,
  wordsPerMinute: 300,
  minReadTime: 300,
  maxReadTime: 3000,
  variancePercentage: 20
};

/**
 * Calculate typing time based on message content
 * @param {Element} message - The message element
 * @param {boolean} isUserMessage - Whether this is a user message
 * @returns {number} Milliseconds for typing animation
 */
export function calculateTypingTime(message, isUserMessage) {
  // Get settings
  let settings = DEFAULT_ANIMATION_SETTINGS;
  if (window.appSettings && window.appSettings.get) {
    settings = window.appSettings.get().chat.typingAnimation;
  }
  
  // Check which messages should have dynamic timing
  const typingAppliesTo = settings.typingAppliesTo || 'both';
  
  // If it's a user message and dynamic timing doesn't apply to users, return minimum time
  if (isUserMessage && (typingAppliesTo === 'assistant')) {
    return settings.minTypingTime; // User messages are always fast if typingAppliesTo is 'assistant'
  }
  
  // If it's an assistant message and dynamic timing doesn't apply to assistant, return minimum time
  if (!isUserMessage && (typingAppliesTo === 'user')) {
    return settings.minTypingTime; // Assistant messages are fast if typingAppliesTo is 'user'
  }
  
  // Get the text content (all text, including nested elements)
  const text = message.textContent || '';
  
  // Count words (approximately)
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // If wordsPerMinute is false or 0, use fixed range
  if (!settings.wordsPerMinute) {
    return Math.min(
      settings.maxTypingTime,
      Math.max(settings.minTypingTime, wordCount * 50)
    );
  }
  
  // Calculate base time in milliseconds: (words / words per minute) * 60 * 1000
  const baseTimeMs = (wordCount / settings.wordsPerMinute) * 60 * 1000;
  
  // Add variance to make it more natural
  const varianceFactor = 1 + (Math.random() * (settings.variancePercentage / 100) * 2 - settings.variancePercentage / 100);
  
  // Apply bounds
  return Math.min(
    settings.maxTypingTime,
    Math.max(settings.minTypingTime, baseTimeMs * varianceFactor)
  );
}

/**
 * Determine the size category of a message for animation
 * @param {Element} message - The message element
 * @returns {string} Size category: "small", "medium", or "large"
 */
export function getMessageSize(message) {
  const text = message.textContent || '';
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  if (wordCount < 20) {
    return "small";
  } else if (wordCount < 50) {
    return "medium";
  } else {
    return "large";
  }
}

/**
 * Calculate reading time based on previous message content
 * @param {Element} message - The previous message element
 * @returns {number} Milliseconds for read delay
 */
export function calculateReadDelay(message) {
  // If no message to read, return minimum delay
  if (!message) {
    return 0;
  }
  
  // Get settings
  let settings = DEFAULT_READ_DELAY_SETTINGS;
  if (window.appSettings && window.appSettings.get) {
    settings = window.appSettings.get().chat.readDelay;
  }
  
  // If read delay is disabled, return 0
  if (!settings.enabled) {
    return 0;
  }
  
  // Get the text content (all text, including nested elements)
  const text = message.textContent || '';
  
  // Count words (approximately)
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // If no words or wordsPerMinute is 0, use minimum time
  if (wordCount === 0 || !settings.wordsPerMinute) {
    return settings.minReadTime;
  }
  
  // Calculate base time in milliseconds: (words / words per minute) * 60 * 1000
  const baseTimeMs = (wordCount / settings.wordsPerMinute) * 60 * 1000;
  
  // Add variance to make it more natural
  const varianceFactor = 1 + (Math.random() * (settings.variancePercentage / 100) * 2 - settings.variancePercentage / 100);
  
  // Apply bounds
  return Math.min(
    settings.maxReadTime,
    Math.max(settings.minReadTime, baseTimeMs * varianceFactor)
  );
} 