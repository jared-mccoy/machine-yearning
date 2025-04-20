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
    }

    // Determine which view to show based on URL and page context
    const urlParams = new URLSearchParams(window.location.search);
    const chatPath = urlParams.get('path');
    
    debugLog(`URL parameters: path=${chatPath}`);
    debugLog(`Current URL: ${window.location.href}`);
    
    // Check if we're viewing index.html or viewer.html
    const isViewerPage = window.location.href.includes('viewer.html');
    const isIndexPage = !isViewerPage && (window.location.pathname === '/' || 
                                         window.location.pathname === '/index.html' ||
                                         window.location.href.includes('index.html'));
    
    debugLog(`Page detection: isViewerPage=${isViewerPage}, isIndexPage=${isIndexPage}`);
    
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
      try {
        await initChatViewer(chatPath);
      } catch (e) {
        debugLog(`Error in chat viewer: ${e.message}`);
        console.error('Chat viewer error:', e);
      }
    } else if (isIndexPage || postContainer) {
      // Home/directory mode - show list of chats
      debugLog('Starting directory view mode');
      try {
        await initDirectoryView();
      } catch (e) {
        debugLog(`Error in directory view: ${e.message}`);
        console.error('Directory view error:', e);
      }
    } else if (isViewerPage || markdownContent) {
      // We're on the viewer page without a path
      debugLog('Viewer page without path parameter');
      if (markdownContent) {
        markdownContent.innerHTML = '<div class="info-message" style="text-align: center; padding: 20px;"><p>No chat selected.</p><p>Please select a conversation from the <a href="index.html">home page</a>.</p></div>';
      }
    } else {
      debugLog('Could not determine page type');
      // Try to add fallback content to the page
      const mainContent = document.querySelector('.content') || document.body;
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="text-align: center; padding: 20px; margin: 20px;">
            <h3>Machine Yearning</h3>
            <p>Please use one of these links:</p>
            <p><a href="index.html" style="margin: 10px; padding: 5px 10px; display: inline-block; border: 1px solid #333; text-decoration: none;">Home Page</a>
            <a href="viewer.html" style="margin: 10px; padding: 5px 10px; display: inline-block; border: 1px solid #333; text-decoration: none;">Chat Viewer</a></p>
          </div>
        `;
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

    // Try to find the markdown content container, or create it if it doesn't exist
    let markdownContent = document.getElementById('markdown-content');
    if (!markdownContent) {
      debugLog('Markdown content container not found, creating one');
      
      // Find a suitable parent element - use the .content div or body
      const parentElement = document.querySelector('.content') || document.body;
      
      // Create a new markdown content container
      markdownContent = document.createElement('div');
      markdownContent.id = 'markdown-content';
      markdownContent.className = 'markdown-body';
      
      // Add a loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'loading';
      loadingIndicator.className = 'loading-indicator';
      loadingIndicator.textContent = 'Loading conversation...';
      
      markdownContent.appendChild(loadingIndicator);
      parentElement.appendChild(markdownContent);
      
      debugLog('Created markdown content container and added to DOM');
    } else {
      debugLog('Found existing markdown content container');
    }

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
    
    // Extract title from the markdown
    let title = 'Chat';
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      document.title = `${title} | Machine Yearning`;
      debugLog(`Set page title to: ${title}`);
    }
    
    // Set up navigation config
    const navConfig = {
      prevLink: nav.prev ? `viewer.html?path=${nav.prev.path}` : null,
      nextLink: nav.next ? `viewer.html?path=${nav.next.path}` : null,
      title: title
    };
    
    // Initialize the chat converter with the markdown content
    if (window.initChatConverter) {
      debugLog('Initializing chat converter');
      window.initChatConverter({
        contentSelector: '#markdown-content',
        rawMarkdown: markdown,
        navConfig: navConfig,
        showTitle: true
      });
      debugLog('Chat converter initialized');
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
    
    // Try to find the post container, or create it if it doesn't exist
    let postContainer = document.getElementById('post-container');
    if (!postContainer) {
      debugLog('Post container not found, creating one');
      
      // Find a suitable parent element - use the .content div or body
      const parentElement = document.querySelector('.content') || document.body;
      
      // Create a new post container
      postContainer = document.createElement('div');
      postContainer.id = 'post-container';
      
      // Add a loading indicator
      const loadingIndicator = document.createElement('div');
      loadingIndicator.id = 'loading';
      loadingIndicator.className = 'loading-indicator';
      loadingIndicator.textContent = 'Scanning for conversations...';
      
      postContainer.appendChild(loadingIndicator);
      parentElement.appendChild(postContainer);
      
      debugLog('Created post container and added to DOM');
    } else {
      debugLog('Found existing post container');
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
        link.href = `viewer.html?path=${file.path}`;
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