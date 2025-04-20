/**
 * Machine Yearning App
 * Main application logic and routing
 */

// Debug function to log directly to the page
function debugLog(message) {
  console.log(message);
  try {
    const debugElement = document.createElement('div');
    debugElement.className = 'debug-log';
    debugElement.style.padding = '8px';
    debugElement.style.margin = '8px';
    debugElement.style.background = '#f0f0f0';
    debugElement.style.border = '1px solid #ccc';
    debugElement.style.color = '#333';
    debugElement.textContent = message;
    document.body.appendChild(debugElement);
  } catch (e) {
    console.error('Error adding debug element:', e);
  }
}

// Initialize the application
async function initApp() {
  try {
    debugLog(`Document readyState: ${document.readyState}`);
    
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
        markdownContent.innerHTML = '<div class="info-message">No chat selected. Please select a chat from the <a href="index.html">home page</a>.</div>';
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
    try {
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.style.padding = '16px';
      errorElement.style.margin = '16px';
      errorElement.style.background = '#ffeeee';
      errorElement.style.border = '1px solid #cc0000';
      errorElement.style.color = '#cc0000';
      errorElement.innerHTML = `<strong>Error:</strong> ${error.message}<br><pre>${error.stack}</pre>`;
      document.body.appendChild(errorElement);
    } catch (e) {
      console.error('Failed to add error element:', e);
    }
  }
}

// Initialize the chat viewer with a specific chat file
async function initChatViewer(chatPath) {
  try {
    // Make sure chat scanner is initialized
    if (!window.chatScanner) {
      console.error('Chat scanner not available');
      return;
    }

    // Initialize the chat scanner to get navigation data
    await window.chatScanner.init();
    
    // Get navigation links
    const nav = window.chatScanner.getNavigation(chatPath);
    
    // Fetch the chat content
    const response = await fetch(chatPath);
    if (!response.ok) {
      throw new Error(`Failed to load chat: ${response.status}`);
    }
    
    const markdown = await response.text();
    
    // Extract title from the markdown
    let title = 'Chat';
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
      document.title = `${title} | Machine Yearning`;
    }
    
    // Set up navigation config
    const navConfig = {
      prevLink: nav.prev ? `?path=${nav.prev.path}` : null,
      nextLink: nav.next ? `?path=${nav.next.path}` : null,
      title: title
    };
    
    // Initialize the chat converter with the markdown content
    if (window.initChatConverter) {
      window.initChatConverter({
        contentSelector: '#markdown-content',
        rawMarkdown: markdown,
        navConfig: navConfig,
        showTitle: true
      });
    } else {
      console.error('Chat converter not available');
    }
  } catch (error) {
    console.error('Error initializing chat viewer:', error);
    const content = document.querySelector('#markdown-content') || document.body;
    content.innerHTML = `<div class="error-message">Error loading chat: ${error.message}</div>`;
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
    
    const postContainer = document.getElementById('post-container');
    const loadingIndicator = document.getElementById('loading');
    
    if (!postContainer) {
      console.error('Post container element not found');
      return;
    }
    
    // Initialize the chat scanner and get the dates
    const dates = await window.chatScanner.init();
    
    if (dates.length === 0) {
      if (loadingIndicator) {
        loadingIndicator.textContent = 'No conversations found. Add markdown files to the content directory to get started.';
      }
      return;
    }
    
    // Hide the loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Create HTML for each date
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
        link.href = `?path=${file.path}`;
        link.textContent = file.title;
        
        listItem.appendChild(link);
        postList.appendChild(listItem);
      });
      
      dateSection.appendChild(postList);
      postContainer.appendChild(dateSection);
    });
  } catch (error) {
    console.error('Error initializing directory view:', error);
    const postContainer = document.getElementById('post-container');
    if (postContainer) {
      postContainer.innerHTML = `<div class="error-message">Error loading chat directory: ${error.message}</div>`;
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