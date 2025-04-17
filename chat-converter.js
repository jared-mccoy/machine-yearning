document.addEventListener('DOMContentLoaded', function() {
  // Get the content from markdown
  const content = document.querySelector('.markdown-body') || document.body;
  const rawContent = content.innerHTML;
  
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
    const line = lines[i].trim();
    
    // Detect headers (## style markdown headers)
    if (isMarkdownHeader(line)) {
      // Save current message if exists
      if (currentSpeaker && currentMessage.trim()) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
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
      messages.push({
        type: 'header',
        content: markdownHeaderToHtml(line),
        level: level,
        id: 'header-' + currentSectionId
      });
      
      // Reset the current speaker and message
      currentSpeaker = null;
      currentMessage = '';
    }
    // Detect speaker change
    else if (line.includes('<!-- USER -->')) {
      if (currentSpeaker && currentMessage.trim()) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
      }
      currentSpeaker = 'user';
      currentMessage = '';
    } else if (line.includes('<!-- ASSISTANT -->')) {
      if (currentSpeaker && currentMessage.trim()) {
        currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
      }
      currentSpeaker = 'assistant';
      currentMessage = '';
    } else if (currentSpeaker) {
      // Skip the comment line itself
      if (!line.includes('<!--') && !line.includes('-->')) {
        currentMessage += line + '\n';
      }
    }
  }
  
  // Add the last message and section
  if (currentSpeaker && currentMessage.trim()) {
    currentSectionMessages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
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
      
      // Create the toggle button
      const toggleButton = document.createElement('button');
      toggleButton.className = 'section-toggle';
      toggleButton.innerHTML = '<span class="toggle-icon">▼</span>';
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
        
        // Find the next section and toggle its visibility
        const sectionId = msg.id.replace('header', 'section');
        const section = document.getElementById(sectionId);
        if (section) {
          section.style.display = isExpanded ? 'none' : 'block';
          this.querySelector('.toggle-icon').textContent = isExpanded ? '►' : '▼';
        }
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
        
        // Process code blocks with syntax highlighting
        let processedContent = message.content;
        
        // Convert markdown code blocks to HTML
        processedContent = processedContent.replace(/```(\w*)\n([\s\S]*?)\n```/g, function(match, language, code) {
          const languageClass = language ? ` class="language-${language}"` : '';
          const languageTag = language ? `<div class="language-tag">${language}</div>` : '';
          return `<div class="code-block">${languageTag}<pre><code${languageClass}>${code}</code></pre></div>`;
        });
        
        // Convert inline code
        processedContent = processedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert bold text
        processedContent = processedContent.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Convert italic text
        processedContent = processedContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Convert unordered lists
        processedContent = processedContent.replace(/^- (.*?)$/gm, '<li>$1</li>');
        processedContent = processedContent.replace(/(<li>.*?<\/li>)\n(<li>)/g, '$1$2');
        processedContent = processedContent.replace(/(<li>.*?<\/li>)(?!\n<li>)/g, '<ul>$1</ul>');
        
        // Convert blockquotes
        processedContent = processedContent.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
        
        // Convert paragraphs (lines separated by blank lines)
        processedContent = processedContent.replace(/^(?!<[uo]l>|<li>|<blockquote>|<pre>|<div class="code-block")([^\n]+)$/gm, '<p>$1</p>');
        
        messageDiv.innerHTML = processedContent;
        sectionDiv.appendChild(messageDiv);
      });
      
      chatContainer.appendChild(sectionDiv);
    }
  });
  
  // Replace the content with our chat UI
  content.innerHTML = '';
  
  // Add title
  const title = document.createElement('h1');
  title.textContent = document.title || 'Machine Yearning Chat';
  content.appendChild(title);
  
  content.appendChild(chatContainer);
  
  // Add syntax highlighting if Prism is available
  if (window.Prism) {
    Prism.highlightAll();
  }
}); 