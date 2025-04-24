/**
 * Machine Yearning Chat Converter - Parsing Methods
 * Contains methods for parsing and extracting information from markdown
 */

/**
 * Check if a line is a markdown header
 * @param {string} line - The line to check
 * @returns {boolean} Whether the line is a markdown header
 */
export function isMarkdownHeader(line) {
  return /^#{2,4}\s+.+/.test(line.trim());
}

/**
 * Get the level of a markdown header
 * @param {string} line - The header line
 * @returns {number} The header level (1-6)
 */
export function getMarkdownHeaderLevel(line) {
  const match = line.match(/^(#{2,4})\s+.+/);
  return match ? match[1].length : 0;
}

/**
 * Extract speaker name from a message marker comment
 * @param {string} line - The line containing the speaker marker
 * @returns {string|null} The speaker name or null if not found
 */
export function extractSpeaker(line) {
  // Check for [[[SPEAKER]]] format
  const speakerMatch = line.match(/\[\[\[(.*?)\]\]\]/);
  if (speakerMatch) {
    return speakerMatch[1].trim().toLowerCase();
  }
  
  // Check for <!-- SPEAKER --> format (alternate format)
  const htmlCommentMatch = line.match(/<!--\s*(.*?)\s*-->/);
  if (htmlCommentMatch) {
    return htmlCommentMatch[1].trim().toLowerCase();
  }
  
  return null;
}

/**
 * Create a placeholder for spaces
 * @param {number} spaces - Number of spaces
 * @returns {string} Space placeholder
 */
export function createSpacePlaceholder(spaces) {
  return `__SPACES_${spaces}__`;
}

/**
 * Restore space placeholders to actual spaces
 * @param {string|Object} text - Text with space placeholders
 * @returns {string} Text with spaces restored
 */
export function restoreSpacePlaceholders(text) {
  // Handle case where text is an object (happens with newer marked versions)
  if (typeof text === 'object') {
    // Directly try the text property
    if (text && typeof text.text === 'string') {
      const processedText = text.text.replace(/__SPACES_(\d+)__/g, (match, count) => {
        return ' '.repeat(parseInt(count, 10));
      });
      return processedText;
    }
    console.warn('Unable to restore space placeholders on object:', text);
    return text && text.raw ? text.raw : String(text);
  }
  
  // Handle case where we got a string
  if (typeof text === 'string') {
    return text.replace(/__SPACES_(\d+)__/g, (match, count) => {
      return ' '.repeat(parseInt(count, 10));
    });
  }
  
  // Last resort - return as is
  console.warn('Unable to restore spaces on unexpected type:', typeof text);
  return text;
}

/**
 * Helper function to escape HTML
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
} 