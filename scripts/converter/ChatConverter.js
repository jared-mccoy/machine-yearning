/**
 * Machine Yearning Chat Converter
 * A unified chat conversion utility leveraging standard libraries for proper rendering
 */

import { processChatContent } from './methods/processing.js';
import { enhanceCodeBlocks } from './methods/rendering.js';

/**
 * Initialize chat conversion
 * @param {Object} options - Initialization options
 */
function initChatConverter(options = {}) {
  const opts = {
    contentSelector: '.markdown-body',
    rawMarkdown: null,
    navConfig: {
      prevLink: null,
      nextLink: null,
      title: null
    },
    showTitle: false,
    ...options
  };

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processChatContent(opts));
  } else {
    processChatContent(opts);
  }
  
  // Add function to enhance code blocks with language tags and copy buttons
  enhanceCodeBlocks();
}

// Create a global instance and expose it
window.initChatConverter = initChatConverter;
window.enhanceCodeBlocks = enhanceCodeBlocks;

// Export the function
export default initChatConverter; 