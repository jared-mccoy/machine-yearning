/**
 * Machine Yearning Chat Animator
 * Handles typing indicators and sequential message display
 */

import { setupScrollObservers, setupScrollHandler, checkFollowingMessages } from './methods/scroll.js';
import { calculateTypingTime, getMessageSize, calculateReadDelay } from './methods/timing.js';
import { animateHeader, processNextInQueue } from './methods/animation.js';

class ChatAnimator {
  constructor(options = {}) {
    // Animation state
    this.animationQueue = [];
    this.animationInProgress = false;
    this.animationFailedMessages = [];
    this.typingIndicatorVisible = false;
    this.lastSenderWasUser = false;
    this.messageObserver = null;
    this.headerAnimationInProgress = false;
    
    // Set up initial state
    this.isProcessing = false;
    this.messageQueue = [];

    if (window.debugLog) {
      window.debugLog(`First message is from ${this.lastSenderWasUser ? 'user' : 'assistant'}`, 'system');
    }
    
    // Bind methods to maintain proper this context
    this.initChatAnimations = this.initChatAnimations.bind(this);
    this.updateAnimationState = this.updateAnimationState.bind(this);
    this.setupScrollObservers = setupScrollObservers.bind(null, this);
    this.setupScrollHandler = setupScrollHandler.bind(null, this);
    this.checkFollowingMessages = checkFollowingMessages.bind(null, this);
    this.calculateTypingTime = calculateTypingTime;
    this.getMessageSize = getMessageSize;
    this.calculateReadDelay = calculateReadDelay;
    this.animateHeader = animateHeader;
    this.processNextInQueue = processNextInQueue.bind(null, this);
    this.makeElementsVisibleUpTo = this.makeElementsVisibleUpTo.bind(this);
  }

  /**
   * Make all elements up to (and including) a target element immediately visible
   * @param {Element} targetElement - The target element to scroll to
   * @returns {number} - The number of elements made visible
   */
  makeElementsVisibleUpTo(targetElement) {
    if (!targetElement) return 0;

    // Get all messages and headers
    const messages = document.querySelectorAll('.message');
    const headers = document.querySelectorAll('.chat-section-header');
    
    // Create a combined sorted array of elements
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
    
    // Sort by vertical position
    allElements.sort((a, b) => a.top - b.top);
    
    // Find target element's position in the array
    const targetPos = allElements.findIndex(item => item.element === targetElement);
    
    if (targetPos !== -1) {
      // Make all elements up to and including the target immediately visible
      for (let i = 0; i <= targetPos; i++) {
        const item = allElements[i];
        // Mark as already processed
        item.element.setAttribute('data-observed', 'processed');
        
        if (item.type === 'header') {
          item.element.classList.remove('header-hidden');
          item.element.classList.add('header-visible');
        } else {
          item.element.classList.remove('hidden');
          item.element.classList.add('visible');
        }
      }
      
      // Remove these elements from the animation queue
      this.animationQueue = this.animationQueue.filter(queueItem => {
        return !allElements.slice(0, targetPos + 1).some(
          item => item.element === queueItem.element
        );
      });
      
      // Also remove from failed messages if present
      this.animationFailedMessages = this.animationFailedMessages.filter(element => {
        return !allElements.slice(0, targetPos + 1).some(
          item => item.element === element
        );
      });
      
      if (window.debugLog) {
        window.debugLog(`Made ${targetPos + 1} elements visible immediately for hash navigation`, 'system');
      }
      
      return targetPos + 1;
    }
    
    return 0;
  }

  /**
   * Initialize animation system when chat content is loaded
   * @param {boolean} firstMessageShown - Whether the first message is already shown
   */
  initChatAnimations(firstMessageShown = false) {
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
    this.animationQueue = [];
    this.animationInProgress = false;
    this.animationFailedMessages = [];
    this.typingIndicatorVisible = false;
    this.headerAnimationInProgress = false;
    
    // Set the initial lastSenderWasUser based on the first message
    if (messages.length > 0) {
      // Check if the first message is from the user or assistant
      const firstMessage = messages[0];
      this.lastSenderWasUser = firstMessage.classList.contains('user');
      if (window.debugLog) {
        window.debugLog(`First message is from ${this.lastSenderWasUser ? 'user' : 'assistant'}`, 'system');
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
    this.setupScrollObservers();
    
    // Set up bottom-of-page detection for revealing more messages
    this.setupScrollHandler();
    
    // Add elements to the animation queue in their visual order
    const initialElementsToQueue = 5; // Number of initial elements to queue
    for (let i = 0; i < Math.min(initialElementsToQueue, allElements.length); i++) {
      this.animationQueue.push(allElements[i]);
    }
    
    // Wait for next animation frame to ensure DOM is fully ready
    requestAnimationFrame(() => {
      // Process the queue to start animations
      this.processNextInQueue();
    });
    
    if (window.debugLog) {
      window.debugLog('Chat animations initialized', 'system');
    }
  }

  /**
   * Update animation state when toggling animation on/off
   * @param {boolean} enabled - Whether animations are enabled
   */
  updateAnimationState(enabled) {
    // Remove any typing indicators
    document.querySelectorAll('.typing-indicator').forEach(indicator => {
      indicator.classList.remove('visible');
      indicator.remove();
    });
    
    // Clear queue state
    this.animationQueue = [];
    this.animationFailedMessages = [];
    this.animationInProgress = false;
    this.typingIndicatorVisible = false;
    this.headerAnimationInProgress = false;
    
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
      this.initChatAnimations(true);
    }
  }

  init() {
    // ... existing code ...
    
    // If we made it here, initialization was successful
    if (window.debugLog) {
      window.debugLog('Chat animations initialized', 'system');
    }
    
    // ... existing code ...
  }
}

// Create a global instance and expose it
const chatAnimator = new ChatAnimator();
window.chatAnimations = chatAnimator;

// Export the class and instance
export { ChatAnimator, chatAnimator as default }; 