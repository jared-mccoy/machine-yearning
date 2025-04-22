/**
 * Machine Yearning App
 * Main application logic and routing
 */

// Track initialization state
let isInitialized = false;

// Debug function to log to console only, not the page
function debugLog(message) {
  // Only log to console, never to the page
  console.log(message);
}

// Special function for error messages that should be visible on the page
function errorLog(message) {
  console.error(message);
  try {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.style.padding = '16px';
    errorElement.style.margin = '16px';
    errorElement.style.background = '#ffeeee';
    errorElement.style.border = '1px solid #cc0000';
    errorElement.style.color = '#cc0000';
    errorElement.innerHTML = `<strong>Error:</strong> ${message}`;
    document.body.appendChild(errorElement);
  } catch (e) {
    console.error('Failed to add error element:', e);
  }
}

// Initialize the application
async function initApp() {
  // Prevent double initialization
  if (isInitialized) {
    debugLog('App already initialized, skipping');
    return;
  }
  
  try {
    debugLog(`Document readyState: ${document.readyState}`);
    
    // Mark as initialized immediately to prevent race conditions
    isInitialized = true;
    
    // Apply theme immediately to avoid flicker
    if (window.themeControls) {
      window.themeControls.initTheme();
      debugLog('Theme initialized');
    } else {
      debugLog('Theme controls not available');
      
      // Fallback theme initialization if themeControls isn't loaded yet
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (typeof window.togglePrismTheme === 'function') {
          window.togglePrismTheme(savedTheme === 'dark');
        }
      }
    }

    // Determine which view to show based on URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const chatPath = urlParams.get('path');
    
    debugLog(`URL parameters: path=${chatPath}`);
    debugLog(`Current URL: ${window.location.href}`);
    
    // Check for the container elements
    let markdownContent = null;
    let postContainer = null;
    
    try {
      markdownContent = document.getElementById('markdown-content');
      debugLog(`markdown-content element: ${markdownContent ? 'found' : 'not found'}`);
    } catch (e) {
      debugLog(`Error getting markdown-content: ${e.message}`);
    }
    
    try {
      postContainer = document.getElementById('post-container');
      debugLog(`post-container element: ${postContainer ? 'found' : 'not found'}`);
    } catch (e) {
      debugLog(`Error getting post-container: ${e.message}`);
    }
    
    // Check if the chat scanner is available
    debugLog(`chatScanner available: ${window.chatScanner ? 'yes' : 'no'}`);
    
    if (chatPath) {
      // Chat viewer mode - show specific chat
      debugLog('Starting chat viewer mode');
      
      // Show chat view, hide directory view
      if (markdownContent) markdownContent.style.display = 'block';
      if (postContainer) postContainer.style.display = 'none';
      
      try {
        await initChatViewer(chatPath);
      } catch (e) {
        debugLog(`Error in chat viewer: ${e.message}`);
        console.error('Chat viewer error:', e);
      }
    } else {
      // Home/directory mode - show list of chats
      debugLog('Starting directory view mode');
      
      // Show directory view, hide chat view
      if (markdownContent) markdownContent.style.display = 'none';
      if (postContainer) postContainer.style.display = 'block';
      
      try {
        await initDirectoryView();
      } catch (e) {
        debugLog(`Error in directory view: ${e.message}`);
        console.error('Directory view error:', e);
      }
    }
  } catch (error) {
    debugLog(`Error in initApp: ${error.message}`);
    console.error('App initialization error:', error);
    
    // Create a visible error message on the page
    errorLog(`App initialization error: ${error.message}`);
  }
}

// Initialize the chat viewer with a specific chat file
async function initChatViewer(chatPath) {
  try {
    debugLog(`Initializing chat viewer for path: ${chatPath}`);
    
    // Make sure chat scanner is initialized
    if (!window.chatScanner) {
      debugLog('Chat scanner not available');
      console.error('Chat scanner not available');
      return;
    }

    // Get the markdown content container
    const markdownContent = document.getElementById('markdown-content');
    if (!markdownContent) {
      debugLog('Markdown content container not found');
      console.error('Markdown content container not found');
      return;
    }
    
    // Define the minimum loading time for data fetching
    const MIN_LOADING_TIME = 500; // Reduced from 1800ms as we're not showing a loader anymore
    const startTime = Date.now();
    
    // Initialize the chat scanner to get navigation data
    debugLog('Initializing chat scanner');
    await window.chatScanner.init();
    
    // Get navigation links
    const nav = window.chatScanner.getNavigation(chatPath);
    debugLog(`Navigation: prev=${nav.prev ? 'yes' : 'no'}, next=${nav.next ? 'yes' : 'no'}`);
    
    // Fetch the chat content
    debugLog(`Fetching chat content from: ${chatPath}`);
    const response = await fetch(chatPath);
    if (!response.ok) {
      throw new Error(`Failed to load chat: ${response.status}`);
    }
    
    const markdown = await response.text();
    debugLog(`Received markdown content (${markdown.length} chars)`);
    
    // Extract the filename from the path to use as fallback
    const fileName = chatPath.split('/').pop().replace('.md', '');
    
    // Extract title from the markdown
    let title = fileName; // Default to filename instead of hardcoded 'Chat'
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      document.title = `${title} | Machine Yearning`;
      debugLog(`Set page title to: ${title} (from H1 header)`);
    } else {
      document.title = `${title} | Machine Yearning`;
      debugLog(`Set page title to: ${title} (from filename)`);
    }
    
    // Update navigation elements
    const navElement = document.getElementById('chat-nav');
    const prevLink = document.getElementById('prev-link');
    const nextLink = document.getElementById('next-link');
    const chatTitle = document.getElementById('chat-title');
    
    if (navElement && prevLink && nextLink && chatTitle) {
      // Show the navigation
      navElement.style.display = 'flex';
      
      // Update title
      chatTitle.textContent = title;
      
      // Update prev link
      if (nav.prev) {
        prevLink.href = `index.html?path=${nav.prev.path}`;
        prevLink.classList.remove('disabled');
      } else {
        prevLink.href = '#';
        prevLink.classList.add('disabled');
      }
      
      // Update next link
      if (nav.next) {
        nextLink.href = `index.html?path=${nav.next.path}`;
        nextLink.classList.remove('disabled');
      } else {
        nextLink.href = '#';
        nextLink.classList.add('disabled');
      }
    }
    
    // Set up navigation config with proper links
    const navConfig = {
      prevLink: null, // Don't use converter's navigation
      nextLink: null, // Don't use converter's navigation
      title: title
    };
    
    debugLog(`Navigation config: prev=${navConfig.prevLink}, next=${navConfig.nextLink}, title="${navConfig.title}"`);
    
    // Calculate elapsed time so far
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, MIN_LOADING_TIME - elapsed);
    
    debugLog(`Page load took ${elapsed}ms, will wait additional ${remainingDelay}ms to meet minimum loading time`);
    
    // Initialize the chat converter with the markdown content
    if (window.initChatConverter) {
      debugLog('Initializing chat converter');
      window.initChatConverter({
        contentSelector: '#markdown-content',
        rawMarkdown: markdown,
        navConfig: navConfig,
        showTitle: false // Set to false since we'll show the navigation elements instead
      });
      debugLog('Chat converter initialized');
      
      // Make all messages hidden initially - animation system will reveal them
      const messages = markdownContent.querySelectorAll('.message');
      messages.forEach(msg => {
        msg.classList.add('hidden');
        msg.classList.remove('visible');
      });
      
      // Ensure the container has proper flex display for positioning
      markdownContent.style.display = 'flex';
      markdownContent.style.flexDirection = 'column';
      
      // Function to start animations once DOM is properly ready
      const startAnimations = () => {
        if (window.chatAnimations) {
          debugLog('Initializing chat animations');
          window.chatAnimations.initChatAnimations();
        } else {
          debugLog('Chat animations not available');
          
          // If we don't have animations, make all messages visible
          const messages = markdownContent.querySelectorAll('.message');
          messages.forEach(msg => {
            msg.classList.remove('hidden');
            msg.classList.add('visible');
          });
        }
        
        // Enhance code blocks after messages are shown
        if (typeof enhanceCodeBlocks === 'function') {
          debugLog('Enhancing code blocks');
          enhanceCodeBlocks();
        }
      };

      // Wait for next animation frame to ensure DOM is rendered
      requestAnimationFrame(() => {
        // Then wait one more frame to be extra sure
        requestAnimationFrame(startAnimations);
      });
    } else {
      debugLog('Chat converter not available');
      console.error('Chat converter not available');
      markdownContent.innerHTML = `<div class="error-message">Chat converter not available. Please check that all scripts are loaded correctly.</div>`;
    }
  } catch (error) {
    debugLog(`Error in initChatViewer: ${error.message}`);
    console.error('Error initializing chat viewer:', error);
    const content = document.querySelector('#markdown-content') || document.querySelector('.content') || document.body;
    content.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 20px;">
        <p><strong>Error loading chat:</strong> ${error.message}</p>
        <p>Please check that the file exists and is accessible.</p>
        <p><a href="index.html">Return to Home</a></p>
      </div>
    `;
  }
}

// Initialize the directory/home view
async function initDirectoryView() {
  try {
    // Make sure chat scanner is initialized
    if (!window.chatScanner) {
      console.error('Chat scanner not available');
      return;
    }
    
    // Get the post container
    const postContainer = document.getElementById('post-container');
    if (!postContainer) {
      debugLog('Post container not found');
      console.error('Post container not found');
      return;
    }
    
    const loadingIndicator = document.getElementById('loading');
    
    // Initialize the chat scanner and get the dates
    debugLog('Initializing chat scanner');
    const dates = await window.chatScanner.init();
    debugLog(`Received ${dates.length} date directories`);
    
    if (dates.length === 0) {
      if (loadingIndicator) {
        loadingIndicator.innerHTML = '<div class="info-message" style="text-align: center; padding: 20px;"><p>No conversations found.</p><p>Add markdown files to the content directory to get started.</p></div>';
      }
      return;
    }
    
    // Hide the loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Clear any existing content first (except the loading indicator)
    Array.from(postContainer.children).forEach(child => {
      if (child.id !== 'loading') {
        postContainer.removeChild(child);
      }
    });
    
    // Create HTML for each date
    debugLog('Creating date sections');
    dates.forEach(date => {
      if (date.files.length === 0) return; // Skip dates with no files
      
      const dateSection = document.createElement('div');
      dateSection.className = 'date-section';
      
      const dateHeader = document.createElement('h2');
      dateHeader.textContent = date.displayName;
      dateSection.appendChild(dateHeader);
      
      const postList = document.createElement('ul');
      postList.className = 'post-list';
      
      date.files.forEach(file => {
        const listItem = document.createElement('li');
        
        const link = document.createElement('a');
        link.href = `index.html?path=${file.path}`;
        link.textContent = file.title;
        
        listItem.appendChild(link);
        postList.appendChild(listItem);
      });
      
      dateSection.appendChild(postList);
      postContainer.appendChild(dateSection);
    });
    
    debugLog('Directory view initialization completed');
  } catch (error) {
    debugLog(`Error in initDirectoryView: ${error.message}`);
    console.error('Error initializing directory view:', error);
    
    // Try to display an error message
    const postContainer = document.getElementById('post-container') || document.querySelector('.content') || document.body;
    if (postContainer) {
      postContainer.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 20px;">
          <p><strong>Error loading chat directory:</strong> ${error.message}</p>
          <p>Please check that the content directory exists and is accessible.</p>
        </div>
      `;
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  debugLog('DOM content loaded event triggered');
  if (document.readyState === 'loading') {
    debugLog('Document still loading, waiting for load event');
  } else {
    debugLog('Document ready, initializing now');
    initApp();
  }
});

// Also try again after window load to be extra sure
window.addEventListener('load', function() {
  debugLog('Window load event triggered');
  setTimeout(function() {
    debugLog('Running delayed initialization');
    initApp();
  }, 100); // Small delay to ensure everything is ready
});

// Expose methods for use in other scripts
window.appController = {
  initApp,
  initChatViewer,
  initDirectoryView
}; 

// Make debug logging globally available
window.debugLog = debugLog; 