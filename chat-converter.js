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

  // Configure marked.js
  marked.setOptions({
    renderer: new marked.Renderer(),
    highlight: function(code, lang) {
      if (window.Prism && lang) {
        try {
          return Prism.highlight(code, Prism.languages[lang], lang);
        } catch (e) {
          console.warn('Error highlighting code:', e);
        }
      }
      return code;
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
  } else {
    // For inline content
    content = document.querySelector(options.contentSelector) || document.body;
    rawContent = content.innerHTML;
  }

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';

  // Split the content by speaker markers
  const userMarker = '<!-- USER -->';
  const assistantMarker = '<!-- ASSISTANT -->';
  const parts = rawContent.split(new RegExp(`(${userMarker}|${assistantMarker})`, 'gi'));

  let currentSpeaker = null;
  const messages = [];

  // Process each part
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    
    if (part.toLowerCase() === userMarker.toLowerCase()) {
      currentSpeaker = 'user';
    } else if (part.toLowerCase() === assistantMarker.toLowerCase() || part.includes('<!-- agent -->')) {
      currentSpeaker = 'assistant';
    } else if (currentSpeaker && part) {
      messages.push({
        speaker: currentSpeaker,
        content: part
      });
    }
  }

  // Create message elements
  messages.forEach(message => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.speaker}`;
    
    // Use marked.js to properly render the markdown
    messageDiv.innerHTML = marked.parse(message.content);
    
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
    
    chatContainer.appendChild(messageDiv);
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