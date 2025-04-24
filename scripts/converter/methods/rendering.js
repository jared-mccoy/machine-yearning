/**
 * Machine Yearning Chat Converter - Rendering Methods
 * Contains methods for rendering HTML components
 */

import { getMarkdownHeaderLevel } from './parsing.js';

/**
 * Convert a markdown header to HTML
 * @param {string} line - The markdown header line
 * @returns {string} The HTML header
 */
export function markdownHeaderToHtml(line) {
  const level = getMarkdownHeaderLevel(line);
  const content = line.replace(/^#{2,4}\s+/, '');
  return `<h${level}>${content}</h${level}>`;
}

/**
 * Create navigation UI (used for both header and footer)
 * @param {string} className - The CSS class for the navigation container
 * @param {Object} navConfig - Navigation configuration
 * @returns {HTMLElement} The navigation element
 */
export function createNavigationUI(className, navConfig) {
  // Create the navigation container
  const navContainer = document.createElement('div');
  navContainer.className = `chat-nav ${className}`;
  
  // Create previous link
  const prevLink = document.createElement('a');
  prevLink.className = 'nav-link prev-link';
  prevLink.href = navConfig.prevLink ? navConfig.prevLink : '#';
  prevLink.setAttribute('aria-label', 'Previous conversation');
  prevLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
  </svg>`;
  
  // Create title
  const title = document.createElement('h2');
  title.className = 'chat-title';
  title.textContent = navConfig.title || 'Conversation';
  
  // Create next link
  const nextLink = document.createElement('a');
  nextLink.className = 'nav-link next-link';
  nextLink.href = navConfig.nextLink ? navConfig.nextLink : '#';
  nextLink.setAttribute('aria-label', 'Next conversation');
  nextLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>`;
  
  // Disable navigation links if they don't lead anywhere
  if (!navConfig.prevLink) {
    prevLink.classList.add('disabled');
  }
  
  if (!navConfig.nextLink) {
    nextLink.classList.add('disabled');
  }
  
  // Assemble the navigation
  navContainer.appendChild(prevLink);
  navContainer.appendChild(title);
  navContainer.appendChild(nextLink);
  
  return navContainer;
}

/**
 * Create a custom renderer for marked.js
 * @param {Function} escapeHtml - Function to escape HTML
 * @param {Function} restoreSpacePlaceholders - Function to restore space placeholders
 * @returns {Object} Marked renderer object
 */
export function createCustomRenderer(escapeHtml, restoreSpacePlaceholders) {
  // Create a new renderer
  const renderer = new window.marked.Renderer();
  
  // Override the code renderer with our own implementation
  renderer.code = function(code, language) {
    console.log("Code renderer received:", typeof code, code, "Language:", language);
    
    try {
      // Extract code content
      let codeText;
      if (typeof code === 'object') {
        codeText = code.text || '';
        // If no explicit language was provided but the object has a lang property, use it
        if (!language && code.lang) {
          language = code.lang;
          console.log("Using language from object:", language);
        }
      } else {
        codeText = code || '';
      }
      
      // Restore spaces from placeholders
      codeText = restoreSpacePlaceholders(codeText);
      
      // For debugging
      console.log("After space restoration:", codeText.substring(0, 100) + "...");
      console.log("Final language:", language);
      
      // Create language class and attribute
      const languageClass = language ? ` class="language-${language}"` : '';
      
      // Basic Prism highlighting if available and language is supported
      let highlighted;
      if (window.Prism && language && Prism.languages[language]) {
        try {
          highlighted = Prism.highlight(codeText, Prism.languages[language], language);
        } catch (e) {
          console.warn('Error highlighting code with Prism:', e);
          highlighted = escapeHtml(codeText);
        }
      } else {
        highlighted = escapeHtml(codeText);
      }
      
      // Return the HTML with data attribute for language
      return `<pre${languageClass} data-language="${language || 'code'}"><code${languageClass}>${highlighted}</code></pre>`;
    } catch (e) {
      console.error("Error in custom code renderer:", e);
      return `<pre><code>Error rendering code block</code></pre>`;
    }
  };
  
  return renderer;
}

/**
 * Process a conversation section into DOM elements
 * @param {Array} messages - Array of message objects
 * @param {Object} renderer - Custom marked renderer
 * @returns {HTMLElement} Container with rendered messages
 */
export function processConversation(messages, renderer) {
  const messageContainer = document.createElement('div');
  messageContainer.className = 'messages';
  
  // Track speakers for alternating UI
  let lastSpeaker = null;
  
  // Process each message in the current section
  messages.forEach(msgData => {
    // Create the message element
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    
    // Get the appropriate class for this speaker
    const speakerClass = getSpeakerClass(msgData.speaker);
    messageEl.classList.add(speakerClass);
    
    // Add a data attribute for the speaker
    messageEl.setAttribute('data-speaker', msgData.speaker);
    
    // Create a timestamp if it exists
    if (msgData.timestamp) {
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.textContent = msgData.timestamp;
      messageEl.appendChild(timestamp);
    }
    
    // Create a container for the message content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'content-container';
    
    // Add speaker display name if it's a different speaker from the last message
    if (msgData.speaker !== lastSpeaker) {
      const speakerNameEl = document.createElement('div');
      speakerNameEl.className = 'speaker-name';
      
      // Use a more user-friendly name based on the speaker class
      if (speakerClass === 'assistant') {
        speakerNameEl.textContent = 'Assistant';
      } else if (speakerClass === 'user') {
        speakerNameEl.textContent = 'User';
      } else if (speakerClass === 'speakerC') {
        speakerNameEl.textContent = 'Speaker C';
      } else if (speakerClass === 'speakerD') {
        speakerNameEl.textContent = 'Speaker D';
      } else if (speakerClass === 'speakerE') {
        speakerNameEl.textContent = 'Speaker E';
      } else if (speakerClass === 'random') {
        speakerNameEl.textContent = 'System';
      } else {
        speakerNameEl.textContent = msgData.speaker || 'Anonymous';
      }
      
      contentContainer.appendChild(speakerNameEl);
    }
    
    // Create the message content
    const contentEl = document.createElement('div');
    contentEl.className = 'content';
    contentEl.innerHTML = window.marked.parse(msgData.content, { renderer });
    
    // Add content to container
    contentContainer.appendChild(contentEl);
    messageEl.appendChild(contentContainer);
    
    // Add this message to the container
    messageContainer.appendChild(messageEl);
    
    // Update the last speaker
    lastSpeaker = msgData.speaker;
  });
  
  return messageContainer;
}

/**
 * Enhance code blocks with language tags and copy buttons
 */
export function enhanceCodeBlocks() {
  // Wait until the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCodeEnhancements);
  } else {
    addCodeEnhancements();
  }
  
  // Function to add enhancements to code blocks
  function addCodeEnhancements() {
    // Find all code blocks
    const codeBlocks = document.querySelectorAll('pre[data-language]');
    
    codeBlocks.forEach(codeBlock => {
      // Get the language from the data attribute
      const language = codeBlock.getAttribute('data-language');
      
      // Only proceed if not already enhanced
      if (!codeBlock.classList.contains('enhanced')) {
        // Add the enhanced class to prevent double enhancement
        codeBlock.classList.add('enhanced');
        
        // Create a container for the language tag and copy button
        const toolbarContainer = document.createElement('div');
        toolbarContainer.className = 'code-toolbar';
        
        // Create the language tag
        const languageTag = document.createElement('span');
        languageTag.className = 'language-tag';
        languageTag.textContent = language || 'code';
        
        // Create the copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;
        
        copyButton.addEventListener('click', function() {
          // Find the code element inside
          const codeEl = codeBlock.querySelector('code');
          if (codeEl) {
            // Get the text content
            const codeText = codeEl.textContent || '';
            
            // Use the Clipboard API if available
            if (navigator.clipboard) {
              navigator.clipboard.writeText(codeText)
                .then(() => {
                  // Show success state
                  copyButton.classList.add('copied');
                  setTimeout(() => {
                    copyButton.classList.remove('copied');
                  }, 2000);
                })
                .catch(err => {
                  console.error('Failed to copy text: ', err);
                  fallbackCopy(codeText);
                });
            } else {
              fallbackCopy(codeText);
            }
          }
        });
        
        // Fallback copy method for older browsers
        function fallbackCopy(text) {
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
            copyButton.classList.add('copied');
            setTimeout(() => {
              copyButton.classList.remove('copied');
            }, 2000);
          } catch (err) {
            console.error('Fallback copy failed: ', err);
          }
          document.body.removeChild(textArea);
        }
        
        // Add a tooltip for the copy button
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = 'Copy';
        copyButton.appendChild(tooltip);
        
        // Add the language tag and copy button to the toolbar
        toolbarContainer.appendChild(languageTag);
        toolbarContainer.appendChild(copyButton);
        
        // Add the toolbar to the code block
        codeBlock.insertBefore(toolbarContainer, codeBlock.firstChild);
      }
    });
  }
}

/**
 * Get the appropriate CSS class for a speaker
 * Used for styling messages differently based on the speaker
 * @param {string} speaker - The speaker identifier
 * @param {Array} speakers - Array of unique speakers seen so far
 * @returns {string} CSS class name for the speaker
 */
export function getSpeakerClass(speaker, speakers = []) {
  // Special case for "random" speaker
  if (speaker === 'random') {
    return 'random';
  }
  
  // Check if this speaker has been seen before
  const speakerIndex = speakers.indexOf(speaker);
  
  // If not found, add to speakers array
  if (speakerIndex === -1) {
    speakers.push(speaker);
    const newIndex = speakers.length - 1;
    
    // Return appropriate class based on the speaker's position
    if (newIndex === 0) return 'assistant'; // First speaker
    if (newIndex === 1) return 'user';      // Second speaker
    if (newIndex === 2) return 'speakerC';  // Third speaker
    if (newIndex === 3) return 'speakerD';  // Fourth speaker
    if (newIndex === 4) return 'speakerE';  // Fifth speaker
    return 'generic-speaker';               // Any other speakers
  } else {
    // Return class for existing speaker
    if (speakerIndex === 0) return 'assistant';
    if (speakerIndex === 1) return 'user';
    if (speakerIndex === 2) return 'speakerC';
    if (speakerIndex === 3) return 'speakerD';
    if (speakerIndex === 4) return 'speakerE';
    return 'generic-speaker';
  }
} 