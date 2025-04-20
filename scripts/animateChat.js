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

/**
 * Initialize animation system when chat content is loaded
 * @param {boolean} firstMessageShown - Whether the first message is already shown
 */
function initChatAnimations(firstMessageShown = false) {
  // Check if animations are enabled
  const animationEnabled = document.documentElement.getAttribute('data-animation') === 'enabled';
  
  // Get all messages
  const messages = document.querySelectorAll('.message');
  
  // Remove any existing typing indicators
  document.querySelectorAll('.typing-indicator:not(.initial-loader)').forEach(indicator => {
    indicator.remove();
  });
  
  if (!animationEnabled) {
    // If animations are disabled, make sure all messages are visible
    messages.forEach(msg => {
      msg.classList.remove('hidden');
      msg.classList.add('visible');
    });
    return;
  }
  
  // Reset animation state
  animationQueue = [];
  animationInProgress = false;
  animationFailedMessages = [];
  typingIndicatorVisible = false;
  
  // Hide all messages initially except the first
  messages.forEach((msg, index) => {
    if (index === 0 && firstMessageShown) {
      // First message already shown by loading animation
      msg.classList.add('visible');
      msg.classList.remove('hidden');
      msg.setAttribute('data-observed', 'processed');
    } else if (index === 0) {
      // First message should be shown if not already
      msg.classList.add('visible');
      msg.classList.remove('hidden');
      msg.setAttribute('data-observed', 'processed');
    } else {
      // All other messages remain hidden for animation
      msg.classList.add('hidden');
      msg.classList.remove('visible');
    }
  });
  
  // Set up intersection observer to reveal messages as they scroll into view
  setupScrollObservers();
  
  // Set up bottom-of-page detection for revealing more messages
  setupScrollHandler();
  
  if (window.debugLog) {
    window.debugLog('Chat animations initialized');
  }
}

/**
 * Set up intersection observers for scroll-based message reveal
 */
function setupScrollObservers() {
  // Get all messages
  const messages = document.querySelectorAll('.message');
  
  // Create observer for messages with a sensitive threshold
  messageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const currentMsg = entry.target;
      
      // Process when message enters viewport or gets close to it
      if (entry.isIntersecting || entry.intersectionRatio > 0.05) {
        const index = Array.from(messages).indexOf(currentMsg);
        
        // Ensure we're handling this message if it's not processed yet
        if (!currentMsg.hasAttribute('data-observed') || currentMsg.classList.contains('hidden')) {
          // Mark as observed
          currentMsg.setAttribute('data-observed', 'true');
          
          // Queue this message if it's not already visible and not already queued
          if (currentMsg.classList.contains('hidden') && 
              !animationQueue.includes(currentMsg) && 
              !animationFailedMessages.includes(currentMsg)) {
            animationQueue.push(currentMsg);
            processNextInQueue();
          }
          
          // Always check if there are more messages to queue
          checkFollowingMessages(index);
        }
        
        // If message is fully visible, stop observing
        if (entry.intersectionRatio > 0.8 || currentMsg.classList.contains('visible')) {
          messageObserver.unobserve(currentMsg);
        }
      }
    });
  }, {
    threshold: [0.05, 0.5, 0.8], // Observe at multiple thresholds
    rootMargin: "0px 0px 300px 0px" // Extend bottom margin to detect earlier
  });
  
  // Start by observing the first few messages
  const initialVisibleCount = Math.min(8, messages.length);
  for (let i = 0; i < initialVisibleCount; i++) {
    const msg = messages[i];
    const rect = msg.getBoundingClientRect();
    if (rect.top < window.innerHeight + 800) { // Generous initial observation range
      messageObserver.observe(msg);
      msg.setAttribute('data-observed', 'true');
    }
  }
  
  // Set first message state
  if (messages.length > 0) {
    // Check if the first message is user or assistant to set initial state
    const firstMsg = messages[0];
    if (firstMsg.classList.contains('user')) {
      lastSenderWasUser = true;
    }
    
    // Mark first message as already processed and make it visible immediately
    firstMsg.setAttribute('data-observed', 'processed');
    firstMsg.classList.remove('hidden');
    firstMsg.classList.add('visible');
    
    // Start observing the second message
    if (messages.length > 1) {
      const secondMsg = messages[1];
      if (!secondMsg.hasAttribute('data-observed')) {
        messageObserver.observe(secondMsg);
        
        // Pre-queue the second message to start animations
        secondMsg.setAttribute('data-observed', 'true');
        animationQueue.push(secondMsg);
        
        // Also observe third message if it exists
        if (messages.length > 2) {
          messageObserver.observe(messages[2]);
        }
      }
    }
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
      // Find the last visible message
      const messages = document.querySelectorAll('.message');
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
            !animationQueue.includes(nextMsg) && 
            !animationFailedMessages.includes(nextMsg)) {
          // Mark message for observation
          nextMsg.setAttribute('data-observed', 'true');
          animationQueue.push(nextMsg);
          processNextInQueue();
        }
      }
      
      // Always observe the next message for better tracking
      messageObserver.observe(nextMsg);
    }
  }
}

/**
 * Process the next message in the animation queue
 */
function processNextInQueue() {
  if (animationQueue.length === 0 || animationInProgress || typingIndicatorVisible) {
    return;
  }
  
  // Check for failed messages first and add them back to the front of the queue
  if (animationFailedMessages.length > 0) {
    // Add them in reverse order to maintain original sequence
    for (let i = animationFailedMessages.length - 1; i >= 0; i--) {
      animationQueue.unshift(animationFailedMessages[i]);
    }
    animationFailedMessages = [];
  }
  
  // Get the next message
  const nextMsg = animationQueue[0];
  const isUser = nextMsg.classList.contains('user');
  
  // Skip if message is already visible (prevent double animations)
  if (nextMsg.classList.contains('visible')) {
    animationQueue.shift(); // Remove from queue
    processNextInQueue(); // Process next message
    return;
  }
  
  // During initial load, enforce alternating pattern 
  if (animationQueue.length > 1 && document.querySelectorAll('.message.visible').length < 3) {
    // If last message shown was from user, next should be assistant and vice versa
    if ((lastSenderWasUser && isUser) || (!lastSenderWasUser && !isUser)) {
      // Look for next message of correct type
      let foundAlternate = false;
      for (let i = 1; i < animationQueue.length; i++) {
        const alternateMsg = animationQueue[i];
        if (isUser !== alternateMsg.classList.contains('user') && 
            !alternateMsg.classList.contains('visible')) { 
          // Swap this message to front of queue to maintain alternation
          animationQueue.splice(i, 1);
          animationQueue.unshift(alternateMsg);
          foundAlternate = true;
          break;
        }
      }
    }
  }
  
  // Now process the message at the front of the queue
  animationInProgress = true;
  const currentMsg = animationQueue.shift();
  const currentIsUser = currentMsg.classList.contains('user');
  
  // Get the visible message count
  const visibleCount = document.querySelectorAll('.message.visible').length;
  
  // Skip animation for the first few messages to get things started
  if (visibleCount < 1) {
    // First message should be visible immediately without animation
    currentMsg.classList.remove('hidden');
    currentMsg.classList.add('visible');
    currentMsg.setAttribute('data-observed', 'processed');
    lastSenderWasUser = currentIsUser;
    
    // Move to next message immediately
    setTimeout(() => {
      animationInProgress = false;
      processNextInQueue();
    }, 100);
    return;
  }
  
  // Create typing indicator with appropriate class
  const typingIndicator = document.createElement('div');
  typingIndicator.className = currentIsUser ? 'typing-indicator user-typing' : 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  
  // Store reference to current message
  typingIndicator.messageReference = currentMsg;
  
  // Mark message as processed to avoid double animations
  currentMsg.setAttribute('data-observed', 'processed');
  
  // Find the chat container
  const container = document.querySelector('#markdown-content') || currentMsg.parentNode;
  
  // Find all visible messages to position indicator correctly
  const visibleMessages = Array.from(document.querySelectorAll('.message.visible'));
  
  // Position the typing indicator after the last visible message
  if (visibleMessages.length > 0) {
    const lastVisible = visibleMessages[visibleMessages.length - 1];
    lastVisible.after(typingIndicator);
  } else {
    // If no visible messages yet, add to beginning of container
    container.prepend(typingIndicator);
  }
  
  // Flag that there's a typing indicator showing
  typingIndicatorVisible = true;
  
  // Show the typing indicator with a small delay
  setTimeout(() => {
    typingIndicator.classList.add('visible');
  }, 50);
  
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
  }, currentIsUser ? 800 : 1200); // Shorter typing time for user messages
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
  
  // Apply animation state to messages
  const messages = document.querySelectorAll('.message');
  
  if (!enabled) {
    // Show all messages immediately when disabling animations
    messages.forEach(msg => {
      msg.removeAttribute('data-observed');
      msg.classList.remove('hidden');
      msg.classList.add('visible');
    });
  } else {
    // Reset for animation
    messages.forEach((msg, index) => {
      if (index === 0) {
        // First message stays visible
        msg.classList.add('visible');
        msg.classList.remove('hidden');
      } else {
        msg.removeAttribute('data-observed');
        msg.classList.remove('visible');
        msg.classList.add('hidden');
      }
    });
    
    // Setup animations from scratch
    initChatAnimations(true);
  }
}

/**
 * Create a typing indicator for initial page load
 * @returns {HTMLElement} The typing indicator element
 */
function createInitialTypingIndicator() {
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'typing-indicator initial-loader';
  loadingIndicator.innerHTML = '<span></span><span></span><span></span>';
  loadingIndicator.classList.add('visible');
  return loadingIndicator;
}

// Export functions for use in other modules
window.chatAnimations = {
  initChatAnimations,
  updateAnimationState,
  createInitialTypingIndicator
}; 