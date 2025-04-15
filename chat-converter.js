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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect speaker change
    if (line.includes('<!-- USER -->')) {
      if (currentSpeaker && currentMessage.trim()) {
        messages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
      }
      currentSpeaker = 'user';
      currentMessage = '';
    } else if (line.includes('<!-- ASSISTANT -->')) {
      if (currentSpeaker && currentMessage.trim()) {
        messages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
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
  
  // Add the last message
  if (currentSpeaker && currentMessage.trim()) {
    messages.push({ speaker: currentSpeaker, content: currentMessage.trim() });
  }
  
  // Create message elements
  messages.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${msg.speaker}`;
    
    // Process code blocks with syntax highlighting
    let processedContent = msg.content;
    
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
    chatContainer.appendChild(messageDiv);
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