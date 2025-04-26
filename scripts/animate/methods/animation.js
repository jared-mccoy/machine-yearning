/**
 * Machine Yearning Animation Controller - Animation Methods
 * Contains methods for handling animation processing
 */

/**
 * Animate a header with simple fade-in animation
 * @param {Element} header - The header element to animate
 * @returns {Promise} A promise that resolves when animation completes
 */
export function animateHeader(header) {
  return new Promise((resolve) => {
    // Make the header element visible with animation
    header.classList.remove('header-hidden');
    header.classList.add('header-visible');
    
    // Short animation time for headers
    setTimeout(() => {
      resolve();
    }, 300); // Just a short delay for the animation to complete
  });
}

/**
 * Process the next message in the animation queue
 * @param {Object} animator - Reference to the ChatAnimator instance
 */
export function processNextInQueue(animator) {
  if (animator.animationQueue.length === 0 || 
      animator.animationInProgress || 
      animator.typingIndicatorVisible || 
      animator.headerAnimationInProgress) {
    return;
  }
  
  // Check for failed messages first and add them back to the front of the queue
  if (animator.animationFailedMessages.length > 0) {
    // Add them in reverse order to maintain original sequence
    for (let i = animator.animationFailedMessages.length - 1; i >= 0; i--) {
      animator.animationQueue.unshift({
        element: animator.animationFailedMessages[i],
        type: 'message'
      });
    }
    animator.animationFailedMessages = [];
  }
  
  // Get the next item in the queue
  const nextItem = animator.animationQueue[0];
  
  // Process differently based on type
  if (nextItem.type === 'header') {
    // Process header animation - simple fade in
    const header = nextItem.element;
    
    // Skip if header is already visible
    if (header.classList.contains('header-visible')) {
      animator.animationQueue.shift(); // Remove from queue
      animator.processNextInQueue(); // Process next item
      return;
    }
    
    // Remove from queue
    animator.animationQueue.shift();
    
    // Set header animation in progress
    animator.headerAnimationInProgress = true;
    
    // Animate the header with simple fade-in
    animator.animateHeader(header).then(() => {
      // When header animation is complete, process next item in queue
      animator.headerAnimationInProgress = false;
      animator.processNextInQueue();
    });
  } 
  else {
    // Process message animation
    const nextMsg = nextItem.element;
    
    // Skip if message is already visible
    if (nextMsg.classList.contains('visible')) {
      animator.animationQueue.shift(); // Remove from queue
      animator.processNextInQueue(); // Process next item
      return;
    }
    
    // Now process the message at the front of the queue
    animator.animationInProgress = true;
    const currentMsg = animator.animationQueue.shift().element;
    
    // Determine the speaker type from the message class
    const isUser = currentMsg.classList.contains('user');
    const isSpeakerC = currentMsg.classList.contains('speakerC');
    const isSpeakerD = currentMsg.classList.contains('speakerD');
    const isSpeakerE = currentMsg.classList.contains('speakerE');
    const isGenericSpeaker = currentMsg.classList.contains('generic-speaker');
    const isRandom = currentMsg.classList.contains('random');
    
    // Get the visible message count
    const visibleCount = document.querySelectorAll('.message.visible').length;
    
    // For the first message, always show the typing animation immediately
    const isFirstMessage = visibleCount === 0;
    
    // Find the last visible elements (both messages and headers) sorted by position
    const allVisibleElements = [];
    
    // Add visible messages
    const visibleMessages = Array.from(document.querySelectorAll('.message.visible'));
    visibleMessages.forEach(msg => {
      const rect = msg.getBoundingClientRect();
      allVisibleElements.push({
        element: msg,
        type: 'message',
        top: rect.top
      });
    });
    
    // Add visible headers
    const visibleHeaders = Array.from(document.querySelectorAll('.chat-section-header.header-visible'));
    visibleHeaders.forEach(header => {
      const rect = header.getBoundingClientRect();
      allVisibleElements.push({
        element: header,
        type: 'header',
        top: rect.top
      });
    });
    
    // Sort all visible elements by position
    allVisibleElements.sort((a, b) => a.top - b.top);
    
    // Find the last visible element (whether message or header)
    const lastVisibleElement = allVisibleElements.length > 0 ? 
                             allVisibleElements[allVisibleElements.length - 1].element : 
                             null;
    
    // Find the last visible message for read delay calculation
    const lastVisibleMessage = visibleMessages.length > 0 ? 
                             visibleMessages[visibleMessages.length - 1] : 
                             null;
    
    // Calculate read delay (only if this isn't the first message)
    const readDelay = isFirstMessage ? 0 : animator.calculateReadDelay(lastVisibleMessage);
    
    if (window.debugLog && readDelay > 0) {
      window.debugLog(`Read delay for message: ${readDelay}ms`);
    }
    
    // Wait for read delay before showing typing indicator
    setTimeout(() => {
      // Create typing indicator with appropriate class based on speaker type
      const typingIndicator = document.createElement('div');
      
      // Determine the correct typing indicator class
      let typingClass = 'typing-indicator';
      if (isUser) {
        typingClass += ' user-typing';
      } else if (isSpeakerC) {
        typingClass += ' speakerC-typing';
      } else if (isSpeakerD) {
        typingClass += ' speakerD-typing';
      } else if (isSpeakerE) {
        typingClass += ' speakerE-typing';
      } else if (isGenericSpeaker) {
        typingClass += ' generic-speaker-typing';
      } else if (isRandom) {
        typingClass += ' random-typing';
      }
      
      typingIndicator.className = typingClass;
      typingIndicator.innerHTML = '<span></span><span></span><span></span>';
      
      // Set size attribute based on message length
      if (!isUser) { // Only apply to non-user messages
        const messageSize = animator.getMessageSize(currentMsg);
        typingIndicator.setAttribute('data-size', messageSize);
        
        if (window.debugLog) {
          window.debugLog(`Message size category: ${messageSize}`);
        }
      }
      
      // Position indicator appropriately based on type and layout
      if (isUser) {
        typingIndicator.style.alignSelf = 'flex-end'; // Align user typing to the right
        typingIndicator.style.marginLeft = 'auto';    // Push to the right side
      } else {
        typingIndicator.style.alignSelf = 'flex-start'; // Align all other speakers to the left
        typingIndicator.style.marginRight = 'auto';     // Keep on the left side
      }
      
      // Check if the message has custom layout positioning and apply the same to the indicator
      const layoutPosition = currentMsg.getAttribute('data-layout-position');
      const layoutOffset = currentMsg.getAttribute('data-layout-offset');
      
      if (layoutPosition && layoutOffset) {
        // Apply the same custom positioning as the message will have
        if (layoutPosition === 'left') {
          typingIndicator.style.alignSelf = 'flex-start';
          typingIndicator.style.marginRight = 'auto';
          typingIndicator.style.marginLeft = (layoutOffset * 100) + '%';
          typingIndicator.classList.add('custom-left');
        } else if (layoutPosition === 'right') {
          typingIndicator.style.alignSelf = 'flex-end';
          typingIndicator.style.marginLeft = 'auto';
          typingIndicator.style.marginRight = (layoutOffset * 100) + '%';
          typingIndicator.classList.add('custom-right');
        }
      }
      
      // Store reference to current message
      typingIndicator.messageReference = currentMsg;
      
      // Mark message as processed to avoid double animations
      currentMsg.setAttribute('data-observed', 'processed');
      
      // Find the chat container
      const container = document.querySelector('#markdown-content') || currentMsg.parentNode;
      
      // Position the typing indicator after the last visible element (message or header)
      if (lastVisibleElement) {
        lastVisibleElement.after(typingIndicator);
      } else {
        // If no visible elements yet, add to beginning of container
        container.prepend(typingIndicator);
      }
      
      // Flag that there's a typing indicator showing
      animator.typingIndicatorVisible = true;
      
      // Show the typing indicator with a small delay
      setTimeout(() => {
        typingIndicator.classList.add('visible');
      }, 50);
      
      // For debugging
      if (window.debugLog && isFirstMessage) {
        let speakerType = isUser ? 'user' : 
                         isSpeakerC ? 'speakerC' : 
                         isSpeakerD ? 'speakerD' : 
                         isSpeakerE ? 'speakerE' : 
                         isGenericSpeaker ? 'generic' : 
                         isRandom ? 'random' : 'assistant';
        window.debugLog(`Showing first message typing indicator - ${speakerType} message`);
      }
      
      // Calculate dynamic typing time based on message content
      const typingTime = animator.calculateTypingTime(currentMsg, isUser);
      
      if (window.debugLog) {
        let speakerType = isUser ? 'user' : 
                         isSpeakerC ? 'speakerC' : 
                         isSpeakerD ? 'speakerD' : 
                         isSpeakerE ? 'speakerE' : 
                         isGenericSpeaker ? 'generic' : 
                         isRandom ? 'random' : 'assistant';
        window.debugLog(`Typing time for message: ${typingTime}ms (${speakerType})`);
      }
      
      // After typing animation completes, show the message
      setTimeout(() => {
        // Hide the typing indicator
        typingIndicator.classList.remove('visible');
        animator.typingIndicatorVisible = false;
        
        // Relax the viewport check - just make sure message is near viewport
        const rect = currentMsg.getBoundingClientRect();
        
        // Consider a message "in view" if it's even partially in viewport or within 300px below
        const isInView = rect.top < window.innerHeight + 300;
        
        // If it's anywhere close to view, show the message
        if (isInView) {
          // Update the last sender type
          animator.lastSenderWasUser = isUser;
          
          // Show the message with animation
          currentMsg.classList.remove('hidden');
          currentMsg.classList.add('visible');
          
          // Remove the indicator after its transition completes
          setTimeout(() => typingIndicator.remove(), 300);
          
          // Wait for message animation to complete before processing next
          setTimeout(() => {
            animator.animationInProgress = false;
            animator.processNextInQueue();
          }, 600);
        } else {
          // Message is really far from viewport, don't show it yet
          if (window.debugLog) {
            window.debugLog("Message far from viewport, will retry later");
          }
          
          // Remove the indicator immediately since we're not showing the message
          typingIndicator.remove();
          
          // Add message to failed list to retry later
          animator.animationFailedMessages.push(currentMsg);
          
          // Set a retry timeout that's shorter than normal animation
          setTimeout(() => {
            animator.animationInProgress = false;
            animator.processNextInQueue();
          }, 300);
        }
      }, typingTime); // Use calculated dynamic typing time instead of fixed values
    }, readDelay); // Add read delay before showing typing indicator
  }
} 