/**
 * Machine Yearning Animation Controller
 * Handles typing indicators and sequential message display
 */

// Global animation state
let animationQueue = [];
let animationInProgress = false;
let animationFailedMessages = [];
let typingIndicatorVisible = false;
let lastSenderWasUser = false;
let messageObserver = null;
let headerAnimationInProgress = false;

/**
 * Initialize animation system when chat content is loaded
 * @param {boolean} firstMessageShown - Whether the first message is already shown
 */
function initChatAnimations(firstMessageShown = false) {
  // Check if animations are enabled
  const animationEnabled = document.documentElement.getAttribute('data-animation') === 'enabled';
  
  // Get all messages and headers
  const messages = document.querySelectorAll('.message');
  const headers = document.querySelectorAll('.chat-section-header');
  
  // Remove any existing typing indicators
  document.querySelectorAll('.typing-indicator').forEach(indicator => {
    indicator.remove();
  });
  
  if (!animationEnabled) {
    // If animations are disabled, make sure all messages and headers are visible
    messages.forEach(msg => {
      msg.classList.remove('hidden');
      msg.classList.add('visible');
    });
    headers.forEach(header => {
      header.classList.remove('header-hidden');
      header.classList.add('header-visible');
    });
    return;
  }
  
  // Reset animation state
  animationQueue = [];
  animationInProgress = false;
  animationFailedMessages = [];
  typingIndicatorVisible = false;
  headerAnimationInProgress = false;
  
  // Set the initial lastSenderWasUser based on the first message
  if (messages.length > 0) {
    // Check if the first message is from the user or assistant
    const firstMessage = messages[0];
    lastSenderWasUser = firstMessage.classList.contains('user');
    if (window.debugLog) {
      window.debugLog(`First message is from ${lastSenderWasUser ? 'user' : 'assistant'}`);
    }
  }
  
  // Hide all messages initially
  messages.forEach((msg) => {
    // All messages are hidden for animation, no special handling for first
    msg.classList.add('hidden');
    msg.classList.remove('visible');
  });
  
  // Hide all headers initially
  headers.forEach((header) => {
    header.classList.add('header-hidden');
    header.classList.remove('header-visible');
  });
  
  // Create a map of content elements sorted by position
  const allElements = [];
  
  // Add headers with their positions
  headers.forEach(header => {
    const rect = header.getBoundingClientRect();
    allElements.push({
      element: header,
      type: 'header',
      top: rect.top
    });
  });
  
  // Add messages with their positions
  messages.forEach(message => {
    const rect = message.getBoundingClientRect();
    allElements.push({
      element: message,
      type: 'message',
      top: rect.top
    });
  });
  
  // Sort elements by position
  allElements.sort((a, b) => a.top - b.top);
  
  // Set up intersection observer to reveal messages as they scroll into view
  setupScrollObservers();
  
  // Set up bottom-of-page detection for revealing more messages
  setupScrollHandler();
  
  // Add elements to the animation queue in their visual order
  const initialElementsToQueue = 5; // Number of initial elements to queue
  for (let i = 0; i < Math.min(initialElementsToQueue, allElements.length); i++) {
    animationQueue.push(allElements[i]);
  }
  
  // Wait for next animation frame to ensure DOM is fully ready
  requestAnimationFrame(() => {
    // Process the queue to start animations
    processNextInQueue();
  });
  
  if (window.debugLog) {
    window.debugLog('Chat animations initialized');
  }
}

/**
 * Set up intersection observers for scroll-based message reveal
 */
function setupScrollObservers() {
  // Get all messages and headers
  const messages = document.querySelectorAll('.message');
  const headers = document.querySelectorAll('.chat-section-header');
  
  // Create observer for messages and headers with a sensitive threshold
  messageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const element = entry.target;
      const isHeader = element.classList.contains('chat-section-header');
      
      // Process when element enters viewport or gets close to it
      if (entry.isIntersecting || entry.intersectionRatio > 0.05) {
        // For headers
        if (isHeader) {
          if (!element.hasAttribute('data-observed') || element.classList.contains('header-hidden')) {
            // Mark as observed
            element.setAttribute('data-observed', 'true');
            
            // Queue this header if it's not already visible and not already queued
            if (element.classList.contains('header-hidden') && 
                !animationQueue.some(item => item.element === element)) {
              
              // Important: We need to ensure headers are added BEFORE any messages that come after them
              let insertIndex = 0;
              const elementRect = element.getBoundingClientRect();
              
              // Find the right position in queue
              for (let i = 0; i < animationQueue.length; i++) {
                const queuedItem = animationQueue[i];
                const queuedRect = queuedItem.element.getBoundingClientRect();
                
                if (queuedRect.top > elementRect.top) {
                  // Found a position where this header should be inserted
                  insertIndex = i;
                  break;
                } else {
                  insertIndex = i + 1;
                }
              }
              
              // Insert the header at proper position
              animationQueue.splice(insertIndex, 0, {
                element: element,
                type: 'header',
                top: elementRect.top
              });
              
              // Trigger animation if not already running
              processNextInQueue();
            }
          }
          
          // If header is fully visible, stop observing
          if (entry.intersectionRatio > 0.8 || element.classList.contains('header-visible')) {
            messageObserver.unobserve(element);
          }
        } 
        // For messages
        else {
          const index = Array.from(messages).indexOf(element);
          
          // Ensure we're handling this message if it's not processed yet
          if (!element.hasAttribute('data-observed') || element.classList.contains('hidden')) {
            // Mark as observed
            element.setAttribute('data-observed', 'true');
            
            // Queue this message if it's not already visible and not already queued
            if (element.classList.contains('hidden') && 
                !animationQueue.some(item => item.element === element) && 
                !animationFailedMessages.includes(element)) {
              
              // Find any headers that should appear before this message
              const messageRect = element.getBoundingClientRect();
              const headersBeforeMessage = [];
              
              headers.forEach(header => {
                if (header.classList.contains('header-hidden') && 
                    !header.classList.contains('header-visible') &&
                    !animationQueue.some(item => item.element === header)) {
                  const headerRect = header.getBoundingClientRect();
                  if (headerRect.top < messageRect.top) {
                    headersBeforeMessage.push({
                      element: header,
                      type: 'header',
                      top: headerRect.top
                    });
                  }
                }
              });
              
              // Sort headers by position
              headersBeforeMessage.sort((a, b) => a.top - b.top);
              
              // Add headers before message
              headersBeforeMessage.forEach(header => {
                animationQueue.push(header);
              });
              
              // Add message
              animationQueue.push({
                element: element,
                type: 'message',
                top: messageRect.top
              });
              
              processNextInQueue();
            }
            
            // Check for more messages to queue
            checkFollowingMessages(index);
          }
          
          // If message is fully visible, stop observing
          if (entry.intersectionRatio > 0.8 || element.classList.contains('visible')) {
            messageObserver.unobserve(element);
          }
        }
      }
    });
  }, {
    threshold: [0.05, 0.5, 0.8], // Observe at multiple thresholds
    rootMargin: "0px 0px 300px 0px" // Extend bottom margin to detect earlier
  });
  
  // Create a combined sorted array of elements
  const allElements = [];
  const headersArray = Array.from(headers);
  const messagesArray = Array.from(messages);
  
  // Add headers with positions
  headersArray.forEach(header => {
    const rect = header.getBoundingClientRect();
    allElements.push({
      element: header,
      type: 'header',
      top: rect.top
    });
  });
  
  // Add messages with positions
  messagesArray.forEach(message => {
    const rect = message.getBoundingClientRect();
    allElements.push({
      element: message,
      type: 'message',
      top: rect.top
    });
  });
  
  // Sort by vertical position
  allElements.sort((a, b) => a.top - b.top);
  
  // Start by observing the first few elements
  const initialVisibleCount = Math.min(8, allElements.length);
  for (let i = 0; i < initialVisibleCount; i++) {
    const element = allElements[i].element;
    messageObserver.observe(element);
    element.setAttribute('data-observed', 'true');
  }
}

/**
 * Set up scroll handler for bottom-of-page detection
 */
function setupScrollHandler() {
  window.addEventListener('scroll', function() {
    // Handle failed messages
    if (animationFailedMessages.length > 0 && !animationInProgress && !typingIndicatorVisible) {
      clearTimeout(window.scrollDebounceTimer);
      window.scrollDebounceTimer = setTimeout(() => {
        processNextInQueue();
      }, 100);
      return;
    }
    
    // Check if we're near the bottom of the page
    const scrollPosition = window.scrollY + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const isNearBottom = (pageHeight - scrollPosition) < 300;
    
    if (isNearBottom) {
      // Find all elements and sort by position
      const messages = document.querySelectorAll('.message');
      const headers = document.querySelectorAll('.chat-section-header');
      
      // Find the last visible message
      const visibleMessages = Array.from(document.querySelectorAll('.message.visible'));
      if (visibleMessages.length > 0) {
        const lastVisible = visibleMessages[visibleMessages.length - 1];
        const lastVisibleIndex = Array.from(messages).indexOf(lastVisible);
        
        // Queue more messages when near the bottom
        checkFollowingMessages(lastVisibleIndex);
      }
    }
  }, { passive: true });
}

/**
 * Check and queue messages following the current one
 * @param {number} currentIndex - Index of the current message
 */
function checkFollowingMessages(currentIndex) {
  const messages = document.querySelectorAll('.message');
  const headers = document.querySelectorAll('.chat-section-header');
  
  // Check for next messages to reveal
  if (currentIndex < messages.length - 1) {
    // Look ahead for up to 3 messages
    const lookaheadCount = Math.min(3, messages.length - currentIndex - 1);
    
    for (let i = 1; i <= lookaheadCount; i++) {
      const nextMsg = messages[currentIndex + i];
      
      // Skip if already being processed
      if (nextMsg.hasAttribute('data-observed') && !nextMsg.classList.contains('hidden')) {
        continue;
      }
      
      // Check if in view or near viewport
      const rect = nextMsg.getBoundingClientRect();
      const distanceFromViewport = rect.top - window.innerHeight;
      
      // Queue if within generous range
      if (distanceFromViewport < 800) { // Very generous lookahead for end of page
        if (nextMsg.classList.contains('hidden') && 
            !animationQueue.some(item => item.element === nextMsg) && 
            !animationFailedMessages.includes(nextMsg)) {
          
          // First, find any headers that should be shown before this message
          const messageRect = nextMsg.getBoundingClientRect();
          const headersBeforeMessage = [];
          
          headers.forEach(header => {
            if (header.classList.contains('header-hidden') && 
                !animationQueue.some(item => item.element === header)) {
              const headerRect = header.getBoundingClientRect();
              if (headerRect.top < messageRect.top) {
                headersBeforeMessage.push({
                  element: header,
                  type: 'header',
                  top: headerRect.top
                });
              }
            }
          });
          
          // Sort headers by position
          headersBeforeMessage.sort((a, b) => a.top - b.top);
          
          // Add headers before message
          headersBeforeMessage.forEach(header => {
            animationQueue.push(header);
          });
          
          // Mark message for observation
          nextMsg.setAttribute('data-observed', 'true');
          
          // Then add message
          animationQueue.push({
            element: nextMsg,
            type: 'message',
            top: messageRect.top
          });
          
          processNextInQueue();
        }
      }
      
      // Always observe the next message for better tracking
      messageObserver.observe(nextMsg);
    }
  }
}

/**
 * Calculate typing time based on message content
 * @param {Element} message - The message element
 * @param {boolean} isUserMessage - Whether this is a user message
 * @returns {number} Milliseconds for typing animation
 */
function calculateTypingTime(message, isUserMessage) {
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
function getMessageSize(message) {
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
 * Calculate reading time based on previous message content
 * @param {Element} message - The previous message element
 * @returns {number} Milliseconds for read delay
 */
function calculateReadDelay(message) {
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

/**
 * Animate a header with simple fade-in animation
 * @param {Element} header - The header element to animate
 * @returns {Promise} A promise that resolves when animation completes
 */
function animateHeader(header) {
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
 */
function processNextInQueue() {
  if (animationQueue.length === 0 || animationInProgress || typingIndicatorVisible || headerAnimationInProgress) {
    return;
  }
  
  // Check for failed messages first and add them back to the front of the queue
  if (animationFailedMessages.length > 0) {
    // Add them in reverse order to maintain original sequence
    for (let i = animationFailedMessages.length - 1; i >= 0; i--) {
      animationQueue.unshift({
        element: animationFailedMessages[i],
        type: 'message'
      });
    }
    animationFailedMessages = [];
  }
  
  // Get the next item in the queue
  const nextItem = animationQueue[0];
  
  // Process differently based on type
  if (nextItem.type === 'header') {
    // Process header animation - simple fade in
    const header = nextItem.element;
    
    // Skip if header is already visible
    if (header.classList.contains('header-visible')) {
      animationQueue.shift(); // Remove from queue
      processNextInQueue(); // Process next item
      return;
    }
    
    // Remove from queue
    animationQueue.shift();
    
    // Set header animation in progress
    headerAnimationInProgress = true;
    
    // Animate the header with simple fade-in
    animateHeader(header).then(() => {
      // When header animation is complete, process next item in queue
      headerAnimationInProgress = false;
      processNextInQueue();
    });
  } 
  else {
    // Process message animation (existing code)
    const nextMsg = nextItem.element;
    const isUser = nextMsg.classList.contains('user');
    
    // Skip if message is already visible
    if (nextMsg.classList.contains('visible')) {
      animationQueue.shift(); // Remove from queue
      processNextInQueue(); // Process next item
      return;
    }
    
    // Now process the message at the front of the queue
    animationInProgress = true;
    const currentMsg = animationQueue.shift().element;
    const currentIsUser = currentMsg.classList.contains('user');
    
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
    const readDelay = isFirstMessage ? 0 : calculateReadDelay(lastVisibleMessage);
    
    if (window.debugLog && readDelay > 0) {
      window.debugLog(`Read delay for message: ${readDelay}ms`);
    }
    
    // Wait for read delay before showing typing indicator
    setTimeout(() => {
      // Create typing indicator with appropriate class
      const typingIndicator = document.createElement('div');
      typingIndicator.className = currentIsUser ? 'typing-indicator user-typing' : 'typing-indicator';
      typingIndicator.innerHTML = '<span></span><span></span><span></span>';
      
      // Set size attribute based on message length
      if (!currentIsUser) { // Only apply to assistant messages
        const messageSize = getMessageSize(currentMsg);
        typingIndicator.setAttribute('data-size', messageSize);
        
        if (window.debugLog) {
          window.debugLog(`Message size category: ${messageSize}`);
        }
      }
      
      // Position indicator appropriately based on type
      if (currentIsUser) {
        typingIndicator.style.alignSelf = 'flex-end'; // Align user typing to the right
        typingIndicator.style.marginLeft = 'auto';    // Push to the right side
      } else {
        typingIndicator.style.alignSelf = 'flex-start'; // Align assistant typing to the left
        typingIndicator.style.marginRight = 'auto';     // Keep on the left side
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
      typingIndicatorVisible = true;
      
      // Show the typing indicator with a small delay
      setTimeout(() => {
        typingIndicator.classList.add('visible');
      }, 50);
      
      // For debugging
      if (window.debugLog && isFirstMessage) {
        window.debugLog(`Showing first message typing indicator - ${currentIsUser ? 'user' : 'assistant'} message`);
      }
      
      // Calculate dynamic typing time based on message content
      const typingTime = calculateTypingTime(currentMsg, currentIsUser);
      
      if (window.debugLog) {
        window.debugLog(`Typing time for message: ${typingTime}ms (${currentIsUser ? 'user' : 'assistant'})`);
      }
      
      // After typing animation completes, show the message
      setTimeout(() => {
        // Hide the typing indicator
        typingIndicator.classList.remove('visible');
        typingIndicatorVisible = false;
        
        // Relax the viewport check - just make sure message is near viewport
        const rect = currentMsg.getBoundingClientRect();
        
        // Consider a message "in view" if it's even partially in viewport or within 300px below
        const isInView = rect.top < window.innerHeight + 300;
        
        // If it's anywhere close to view, show the message
        if (isInView) {
          // Update the last sender type
          lastSenderWasUser = currentIsUser;
          
          // Show the message with animation
          currentMsg.classList.remove('hidden');
          currentMsg.classList.add('visible');
          
          // Remove the indicator after its transition completes
          setTimeout(() => typingIndicator.remove(), 300);
          
          // Wait for message animation to complete before processing next
          setTimeout(() => {
            animationInProgress = false;
            processNextInQueue();
          }, 600);
        } else {
          // Message is really far from viewport, don't show it yet
          if (window.debugLog) {
            window.debugLog("Message far from viewport, will retry later");
          }
          
          // Remove the indicator immediately since we're not showing the message
          typingIndicator.remove();
          
          // Add message to failed list to retry later
          animationFailedMessages.push(currentMsg);
          
          // Set a retry timeout that's shorter than normal animation
          setTimeout(() => {
            animationInProgress = false;
            processNextInQueue();
          }, 300);
        }
      }, typingTime); // Use calculated dynamic typing time instead of fixed values
    }, readDelay); // Add read delay before showing typing indicator
  }
}

/**
 * Update animation state when toggling animation on/off
 * @param {boolean} enabled - Whether animations are enabled
 */
function updateAnimationState(enabled) {
  // Remove any typing indicators
  document.querySelectorAll('.typing-indicator').forEach(indicator => {
    indicator.classList.remove('visible');
    indicator.remove();
  });
  
  // Clear queue state
  animationQueue = [];
  animationFailedMessages = [];
  animationInProgress = false;
  typingIndicatorVisible = false;
  headerAnimationInProgress = false;
  
  // Apply animation state to messages
  const messages = document.querySelectorAll('.message');
  const headers = document.querySelectorAll('.chat-section-header');
  
  if (!enabled) {
    // Show all messages and headers immediately when disabling animations
    messages.forEach(msg => {
      msg.removeAttribute('data-observed');
      msg.classList.remove('hidden');
      msg.classList.add('visible');
    });
    
    headers.forEach(header => {
      header.removeAttribute('data-observed');
      header.classList.remove('header-hidden');
      header.classList.add('header-visible');
    });
  } else {
    // Get elements sorted by position
    const allElements = [];
    
    // Add headers with positions
    headers.forEach(header => {
      const rect = header.getBoundingClientRect();
      allElements.push({
        element: header,
        type: 'header',
        top: rect.top
      });
    });
    
    // Add messages with positions
    messages.forEach(message => {
      const rect = message.getBoundingClientRect();
      allElements.push({
        element: message,
        type: 'message',
        top: rect.top
      });
    });
    
    // Sort by position
    allElements.sort((a, b) => a.top - b.top);
    
    // Reset all elements to hidden state
    allElements.forEach((item, index) => {
      const element = item.element;
      element.removeAttribute('data-observed');
      
      if (index === 0) {
        // First element stays visible
        if (item.type === 'header') {
          element.classList.add('header-visible');
          element.classList.remove('header-hidden');
        } else {
          element.classList.add('visible');
          element.classList.remove('hidden');
        }
      } else {
        // Rest hidden for animation
        if (item.type === 'header') {
          element.classList.remove('header-visible');
          element.classList.add('header-hidden');
        } else {
          element.classList.remove('visible');
          element.classList.add('hidden');
        }
      }
    });
    
    // Setup animations from scratch
    initChatAnimations(true);
  }
}

// Export functions for use in other modules
window.chatAnimations = {
  initChatAnimations,
  updateAnimationState
}; 