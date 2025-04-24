/**
 * Machine Yearning Chat Converter - Processing Methods
 * Contains methods for processing markdown content
 */

import { 
  isMarkdownHeader, 
  getMarkdownHeaderLevel,
  extractSpeaker,
  createSpacePlaceholder
} from './parsing.js';

import {
  markdownHeaderToHtml,
  createNavigationUI,
  createCustomRenderer,
  processConversation,
  getSpeakerClass
} from './rendering.js';

/**
 * Process chat content from markdown to HTML
 * @param {Object} options - Processing options
 */
export function processChatContent(options) {
  // Make sure marked.js is available
  if (!window.marked) {
    console.error('Marked.js is required. Please add: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>');
    return;
  }

  // Track all unique speakers in the conversation - this is important for proper message styling
  const speakers = [];
  
  // Import custom renderer and functions from rendering module
  const renderer = createCustomRenderer(escapeHtml, restoreSpacePlaceholders);
  
  // Helper function to get the class for a speaker
  const getSpeakerClassLocal = (speaker) => getSpeakerClass(speaker, speakers);
  
  // Configure marked.js
  window.marked.setOptions({
    renderer: renderer,
    highlight: null, // No highlighting, we'll rely on Prism for that
    pedantic: false,
    gfm: true,
    breaks: true,
    sanitize: false,
    smartypants: false,
    xhtml: false
  });

  // Get content either from selector or provided raw markdown
  let content, rawContent;
  
  if (options.rawMarkdown) {
    // For fetched content
    content = document.getElementById('markdown-content') || document.createElement('div');
    rawContent = options.rawMarkdown;
    content.innerHTML = rawContent;
  } else {
    // For inline content
    content = document.querySelector(options.contentSelector) || document.body;
    rawContent = content.innerHTML;
  }
  
  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';
  
  // Add navigation header if navConfig is provided and showTitle is true
  if (options.navConfig && options.showTitle) {
    const headerNav = createNavigationUI('header-nav', options.navConfig);
    chatContainer.appendChild(headerNav);
  }
  
  // Parse the markdown content into sections and messages
  const lines = rawContent.split('\n');
  const messages = []; // This will hold all messages and headers
  
  // Track the current speaker and accumulated message
  let currentSpeaker = null;
  let currentMessage = '';
  
  // Track sections for organization
  let currentSectionMessages = [];
  let currentSectionId = 0;
  
  // Track header hierarchy for collapsible sections
  let headerHierarchy = [];
  
  // Process each line of the content
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]; // Keep the raw line with whitespace
    const line = rawLine.trim(); // Use trimmed version only for conditionals
    
    // Detect headers (## style markdown headers)
    if (isMarkdownHeader(line)) {
      // Save current message if exists
      if (currentSpeaker && currentMessage) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage });
      }
      
      // If we have messages in the current section, add them to the overall messages array
      if (currentSectionMessages.length > 0) {
        messages.push({
          type: 'section',
          id: 'section-' + currentSectionId,
          messages: currentSectionMessages
        });
        currentSectionId++;
        currentSectionMessages = [];
      }
      
      // Add the header as a special message type
      const level = getMarkdownHeaderLevel(line);
      
      // Update the header hierarchy tracking
      while (headerHierarchy.length > 0 && headerHierarchy[headerHierarchy.length - 1].level >= level) {
        headerHierarchy.pop();
      }
      
      const headerId = 'header-' + currentSectionId;
      const headerEntry = {
        id: headerId,
        level: level,
        parentId: headerHierarchy.length > 0 ? headerHierarchy[headerHierarchy.length - 1].id : null
      };
      
      headerHierarchy.push(headerEntry);
      
      messages.push({
        type: 'header',
        content: markdownHeaderToHtml(line),
        level: level,
        id: headerId,
        parentId: headerEntry.parentId
      });
      
      // Reset the current speaker and message
      currentSpeaker = null;
      currentMessage = '';
    }
    // Detect speaker change using [[[speaker]]] format
    else if (line.includes('[[[') && line.includes(']]]')) {
      // Save the previous message if there is one
      if (currentSpeaker && currentMessage) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage });
      }
      
      // Extract the new speaker name from between [[[ and ]]]
      const newSpeaker = extractSpeaker(line);
      if (newSpeaker) {
        currentSpeaker = newSpeaker;
        currentMessage = '';
      }
    } else if (currentSpeaker) {
      // Skip the comment line itself
      if (!line.includes('<!--') && !line.includes('-->')) {
        // We need to track whether we're in a code block
        let processedLine = rawLine;
        
        // Check if this line contains a code block marker
        if (line.startsWith('```')) {
          // This is a code block marker
          // We just use it as-is
          currentMessage += processedLine + '\n';
          
          // Print debugging info
          console.log("Code block marker:", line);
        } else {
          // Check if we're inside a code block by looking at the previous lines
          let inCodeBlock = false;
          let prevLines = currentMessage.split('\n');
          
          // Start from the end and work backwards
          for (let j = prevLines.length - 1; j >= 0; j--) {
            if (prevLines[j].trim().startsWith('```')) {
              // Found a code block marker
              // Count how many we've seen to determine if we're in a block
              const numMarkers = prevLines.slice(0, j + 1)
                .filter(pl => pl.trim().startsWith('```')).length;
              
              inCodeBlock = numMarkers % 2 !== 0; // Odd number means we're in a block
              break;
            }
          }
          
          // If we're in a code block, process indentation
          if (inCodeBlock) {
            // Check for leading whitespace
            const leadingSpaceMatch = processedLine.match(/^(\s+)/);
            if (leadingSpaceMatch) {
              const spaces = leadingSpaceMatch[0].length;
              // Replace leading spaces with our placeholder
              processedLine = processedLine.replace(/^(\s+)/, createSpacePlaceholder(spaces));
              console.log(`Code line with ${spaces} spaces:`, processedLine);
            }
          }
          
          currentMessage += processedLine + '\n';
        }
      }
    }
  }
  
  // Add the last message and section
  if (currentSpeaker && currentMessage) {
    currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage });
  }
  
  if (currentSectionMessages.length > 0) {
    messages.push({
      type: 'section',
      id: 'section-' + currentSectionId,
      messages: currentSectionMessages
    });
  }
  
  // Create message elements
  messages.forEach(msg => {
    if (msg.type === 'header') {
      // Create a collapsible header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'chat-section-header';
      headerDiv.setAttribute('data-level', msg.level);
      headerDiv.setAttribute('data-section-id', msg.id);
      if (msg.parentId) {
        headerDiv.setAttribute('data-parent-id', msg.parentId);
      }
      
      // Create the toggle button
      const toggleButton = document.createElement('button');
      toggleButton.className = 'section-toggle';
      toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="toggle-icon">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
      </svg>`;
      toggleButton.setAttribute('aria-expanded', 'true');
      toggleButton.setAttribute('aria-controls', msg.id);
      
      // Add the header content
      const headerContent = document.createElement('div');
      headerContent.className = 'header-content';
      headerContent.innerHTML = msg.content;
      
      // Append elements
      headerDiv.appendChild(toggleButton);
      headerDiv.appendChild(headerContent);
      chatContainer.appendChild(headerDiv);
      
      // Set up click handler for toggling
      toggleButton.addEventListener('click', function() {
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        
        // Toggle this section
        const sectionId = msg.id.replace('header', 'section');
        const section = document.getElementById(sectionId);
        if (section) {
          if (isExpanded) {
            section.classList.add('collapsed');
          } else {
            section.classList.remove('collapsed');
          }
        }
        
        // Also toggle all child headers and their sections
        const childHeaderElements = document.querySelectorAll(`[data-parent-id="${msg.id}"]`);
        childHeaderElements.forEach(childHeader => {
          // If we're collapsing, collapse children. If expanding, keep children's current state
          if (isExpanded) {
            const childToggleButton = childHeader.querySelector('.section-toggle');
            if (childToggleButton && childToggleButton.getAttribute('aria-expanded') === 'true') {
              childToggleButton.setAttribute('aria-expanded', 'false');
              
              const childSectionId = childHeader.getAttribute('data-section-id').replace('header', 'section');
              const childSection = document.getElementById(childSectionId);
              if (childSection) {
                childSection.classList.add('collapsed');
              }
            }
            
            // Also hide the child header itself
            childHeader.classList.add('collapsed');
          } else {
            // When expanding, show child headers but keep their sections in current collapse state
            childHeader.classList.remove('collapsed');
          }
        });
      });
    } else if (msg.type === 'section') {
      // Create a section container for messages
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'chat-section';
      sectionDiv.id = msg.id;
      
      // Use the processConversation function to handle the message rendering
      const messageContainer = processConversation(msg.messages, renderer, getSpeakerClassLocal);
      sectionDiv.appendChild(messageContainer);
      
      chatContainer.appendChild(sectionDiv);
    }
  });
  
  // Replace the content with our chat UI
  content.innerHTML = '';
  
  // Add navigation footer if navConfig is provided
  if (options.navConfig) {
    const footerNav = createNavigationUI('footer-nav', options.navConfig);
    chatContainer.appendChild(footerNav);
  }
  
  // Apply hidden class to all messages for animation
  const allMessages = chatContainer.querySelectorAll('.message');
  allMessages.forEach(msg => {
    msg.classList.add('hidden');
  });
  
  // Apply hidden class to headers for animation
  const allHeaders = chatContainer.querySelectorAll('.chat-section-header');
  allHeaders.forEach(header => {
    header.classList.add('header-hidden');
  });
  
  // Add the chat container to the content element
  content.appendChild(chatContainer);
}

/**
 * Helper function to restore space placeholders to actual spaces
 * (Imported from parsing.js but needed directly here for compatibility)
 */
function restoreSpacePlaceholders(text) {
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
 * (Imported from parsing.js but needed directly here for compatibility)
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
} 