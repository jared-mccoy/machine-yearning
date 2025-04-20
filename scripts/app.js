/**
 * Machine Yearning App
 * Main application logic and routing
 */

// Debug function to log directly to the page
function debugLog(message) {
  const debugElement = document.createElement('div');
  debugElement.className = 'debug-log';
  debugElement.style.padding = '8px';
  debugElement.style.margin = '8px';
  debugElement.style.background = '#f0f0f0';
  debugElement.style.border = '1px solid #ccc';
  debugElement.style.color = '#333';
  debugElement.textContent = message;
  document.body.appendChild(debugElement);
  console.log(message);
}

// Initialize the application
async function initApp() {
  try {
    debugLog('App initialization started');
    
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
    
    // Determine if we're on the viewer page or index page
    const markdownContent = document.getElementById('markdown-content');
    const postContainer = document.getElementById('post-container');
    const isViewerPage = markdownContent !== null;
    const isIndexPage = postContainer !== null;
    
    debugLog(`Page context: isViewerPage=${isViewerPage}, isIndexPage=${isIndexPage}`);
    
    if (chatPath) {
      // Chat viewer mode - show specific chat
      debugLog('Starting chat viewer mode');
      await initChatViewer(chatPath);
    } else if (isIndexPage) {
      // Home/directory mode - show list of chats
      debugLog('Starting directory view mode');
      await initDirectoryView();
    } else if (isViewerPage && !chatPath) {
      // We're on the viewer page without a path
      debugLog('Viewer page without path parameter');
      if (markdownContent) {
        markdownContent.innerHTML = '<div class="info-message">No chat selected. Please select a chat from the <a href="index.html">home page</a>.</div>';
      }
    }
  } catch (error) {
    debugLog(`Error in initApp: ${error.message}`);
    console.error('App initialization error:', error);
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
document.addEventListener('DOMContentLoaded', initApp);

// Expose methods for use in other scripts
window.appController = {
  initApp,
  initChatViewer,
  initDirectoryView
}; 

// Make debug logging globally available
window.debugLog = debugLog; 