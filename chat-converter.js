/**
 * Machine Yearning Chat Converter
 * A unified chat conversion utility leveraging standard libraries for proper rendering
 */

// Main function to initialize chat conversion
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
}

// Main processing function
function processChatContent(options) {
  // Make sure marked.js is available
  if (!window.marked) {
    console.error('Marked.js is required. Please add: <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>');
    return;
  }

  // Function to create a placeholder for spaces
  function createSpacePlaceholder(spaces) {
    return `__SPACES_${spaces}__`;
  }

  // Function to restore space placeholders to actual spaces
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

  // Override marked.js renderer to handle our space placeholders
  const renderer = new marked.Renderer();
  
  // Store the original code renderer
  const originalCodeRenderer = renderer.code;
  
  // Override the code renderer to restore space placeholders
  renderer.code = function(code, language) {
    // Log what we're receiving to debug
    console.log("Code renderer received:", typeof code, code);
    
    // Restore the actual spaces from our placeholders
    const codeWithSpaces = restoreSpacePlaceholders(code);
    
    // Create our own code rendering if needed
    try {
      // First try to call the original renderer
      if (typeof originalCodeRenderer === 'function') {
        return originalCodeRenderer.call(this, codeWithSpaces, language);
      }
    } catch (e) {
      console.warn("Error calling original code renderer:", e);
    }
    
    // Fallback to a simple implementation if the original renderer fails
    const codeText = typeof codeWithSpaces === 'string' 
      ? codeWithSpaces 
      : (codeWithSpaces && codeWithSpaces.text ? codeWithSpaces.text : String(codeWithSpaces));
      
    const langClass = language ? ` class="language-${language}"` : '';
    return `<pre><code${langClass}>${codeText}</code></pre>`;
  };

  // Configure marked.js
  marked.setOptions({
    renderer: renderer,
    highlight: function(code, lang) {
      // Restore spaces before syntax highlighting
      const codeWithSpaces = restoreSpacePlaceholders(code);
      
      // Debug highlight input
      console.log("Highlight received:", typeof code, lang);
      
      if (window.Prism && lang) {
        try {
          // If we have a string, use it directly, otherwise use the text property
          const codeText = typeof codeWithSpaces === 'string' 
            ? codeWithSpaces 
            : (codeWithSpaces && codeWithSpaces.text ? codeWithSpaces.text : String(codeWithSpaces));
          
          return Prism.highlight(codeText, Prism.languages[lang], lang);
        } catch (e) {
          console.warn('Error highlighting code:', e);
        }
      }
      return codeWithSpaces;
    },
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
  
  // Parse the content to extract user and assistant messages
  const lines = rawContent.split('\n');
  let currentSpeaker = null;
  let currentMessage = '';
  let messages = [];
  let currentSectionId = 0;
  let currentSectionMessages = [];
  let headerHierarchy = []; // Track header hierarchy for nesting
  
  // Function to detect if a line is a markdown header
  function isMarkdownHeader(line) {
    return /^#{2,4}\s+.+/.test(line);
  }
  
  // Function to get markdown header level
  function getMarkdownHeaderLevel(line) {
    const match = line.match(/^(#{2,4})\s+.+/);
    return match ? match[1].length : 0;
  }
  
  // Function to convert markdown header to HTML
  function markdownHeaderToHtml(line) {
    const level = getMarkdownHeaderLevel(line);
    const content = line.replace(/^#{2,4}\s+/, '');
    return `<h${level}>${content}</h${level}>`;
  }
  
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
    // Detect speaker change
    else if (line.includes('<!-- USER -->') || line.includes('<!-- user -->')) {
      if (currentSpeaker && currentMessage) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage });
      }
      currentSpeaker = 'user';
      currentMessage = '';
    } else if (line.includes('<!-- ASSISTANT -->') || line.includes('<!-- assistant -->') || line.includes('<!-- agent -->')) {
      if (currentSpeaker && currentMessage) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage });
      }
      currentSpeaker = 'assistant';
      currentMessage = '';
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
      
      // Add all messages to this section
      msg.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.speaker}`;
        
        // Use marked.js to parse and render the content
        const renderedContent = marked.parse(message.content);
        messageDiv.innerHTML = renderedContent;
        
        // Add code block language tags
        const codeBlocks = messageDiv.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => {
          const language = codeBlock.className.replace('language-', '');
          if (language && language !== 'language-') {
            const pre = codeBlock.parentNode;
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            
            // Create language tag
            const languageTag = document.createElement('div');
            languageTag.className = 'language-tag';
            languageTag.textContent = language;
            
            // Rearrange DOM
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(languageTag);
            wrapper.appendChild(pre);
          }
        });
        
        sectionDiv.appendChild(messageDiv);
      });
      
      chatContainer.appendChild(sectionDiv);
    }
  });
  
  // Replace the content with our chat UI
  content.innerHTML = '';
  
  // Add title (only if showTitle is true)
  if (options.showTitle) {
  const title = document.createElement('h1');
    title.textContent = options.navConfig?.title || document.title || 'machine yearning chat';
  content.appendChild(title);
  }
  
  content.appendChild(chatContainer);
  
  // Add footer navigation (only if navigation is provided)
  if (options.navConfig?.prevLink || options.navConfig?.nextLink) {
    const footerNav = document.createElement('div');
    footerNav.className = 'chat-nav footer-nav';
    
    // Create previous button
    const prevLink = document.createElement('a');
    prevLink.href = options.navConfig?.prevLink || '#';
    prevLink.className = 'nav-link prev-link';
    if (!options.navConfig?.prevLink || options.navConfig.prevLink === '#') {
      prevLink.classList.add('disabled');
    }
    prevLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>`;
    
    // Create chat title
    const chatTitle = document.createElement('h2');
    chatTitle.className = 'chat-title';
    chatTitle.textContent = options.navConfig?.title || document.title || 'machine yearning chat';
    
    // Add click event to scroll to top
    chatTitle.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Create next button
    const nextLink = document.createElement('a');
    nextLink.href = options.navConfig?.nextLink || '#';
    nextLink.className = 'nav-link next-link';
    if (!options.navConfig?.nextLink || options.navConfig.nextLink === '#') {
      nextLink.classList.add('disabled');
    }
    nextLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
    </svg>`;
    
    // Append elements to footer nav
    footerNav.appendChild(prevLink);
    footerNav.appendChild(chatTitle);
    footerNav.appendChild(nextLink);
    
    content.appendChild(footerNav);
  }
  
  // Add syntax highlighting if Prism is available
  if (window.Prism) {
    // Override the default Prism highlightElement to handle our space placeholders
    const originalHighlightElement = window.Prism.highlightElement;
    window.Prism.highlightElement = function(element) {
      if (element.textContent.includes('__SPACES_')) {
        const originalContent = element.textContent;
        element.textContent = restoreSpacePlaceholders(originalContent);
      }
      
      // Call the original highlighter
      return originalHighlightElement.apply(this, arguments);
    };
    
    // Run Prism highlighting
    Prism.highlightAll();
  }
}

// Auto-initialize on page load for backward compatibility
document.addEventListener('DOMContentLoaded', function() {
  // Only auto-initialize if we're not in chat-viewer.html
  // (which will call initChatConverter explicitly)
  if (!window.location.href.includes('chat-viewer.html')) {
    initChatConverter();
  }
});

// Export the function for use in other scripts
window.initChatConverter = initChatConverter; 