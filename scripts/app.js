/**
 * Machine Yearning App
 * Main application logic and routing
 */

// Track initialization state
let isInitialized = false;

// Track last log messages to avoid repetition
const lastLogMessages = {
  messages: {},
  timestamps: {}
};

// Log settings for different message types
const logSettings = {
  animation: {
    enabled: false,         // Disable most animation logging by default
    cooldownPeriod: 5000    // 5 seconds cooldown for animation messages
  },
  system: {
    enabled: true,          // Always log system messages
    cooldownPeriod: 2000    // 2 seconds cooldown for system messages
  },
  viewport: {
    enabled: true,          // Always log viewport state changes
    cooldownPeriod: 1000    // 1 second cooldown for viewport messages
  }
};

/**
 * Debug function to log to console only, not the page
 * @param {string} message - The message to log
 * @param {string} category - Optional category for the message (animation, system, viewport)
 */
function debugLog(message, category = 'system') {
  // Skip if category is disabled
  if (logSettings[category] && !logSettings[category].enabled) {
    return;
  }
  
  // Skip repetitive messages within a short time period
  const now = Date.now();
  const cooldownPeriod = logSettings[category] ? 
    logSettings[category].cooldownPeriod : 5000; // Default 5 seconds
  
  const messageKey = `${category}:${message}`;
  
  if (lastLogMessages.messages[messageKey] === true && 
      now - lastLogMessages.timestamps[messageKey] < cooldownPeriod) {
    // Skip this repetitive message
    return;
  }
  
  // Update tracking
  lastLogMessages.messages[messageKey] = true;
  lastLogMessages.timestamps[messageKey] = now;
  
  // Skip certain verbose animation messages completely
  if (category === 'animation') {
    // Skip logging read delays and typing times which are very common
    if (message.includes('Read delay for message:') || 
        message.includes('Typing time for message:') ||
        message.includes('Message size category:')) {
      // Only log these once every 20 seconds at most
      if (now - (lastLogMessages.timestamps['animation_verbose'] || 0) < 20000) {
        return;
      }
      lastLogMessages.timestamps['animation_verbose'] = now;
    }
  }
  
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
    
    // Add the directory container class to the post container
    postContainer.classList.add('directory-container');
    
    const loadingIndicator = document.getElementById('loading');
    if (loadingIndicator) {
      loadingIndicator.className = 'directory-loading-indicator';
    }
    
    // Initialize the chat scanner and get the dates
    debugLog('Initializing chat scanner');
    const dates = await window.chatScanner.init();
    debugLog(`Received ${dates.length} date directories`);
    
    if (dates.length === 0) {
      if (loadingIndicator) {
        loadingIndicator.innerHTML = '<div class="directory-info-message"><p>No conversations found.</p><p>Add markdown files to the content directory to get started.</p></div>';
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
    
    // Function to fetch and parse markdown content for headers
    async function getFileHeaders(filePath) {
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          return [];
        }
        
        const markdown = await response.text();
        const headerRegex = /^(#{2,4})\s+(.+)$/gm;
        const headers = [];
        
        let match;
        while ((match = headerRegex.exec(markdown)) !== null) {
          headers.push({
            level: match[1].length, // Number of # symbols
            text: match[2].trim()
          });
        }
        
        return headers;
      } catch (error) {
        console.error(`Error fetching headers from ${filePath}:`, error);
        return [];
      }
    }
    
    debugLog('Creating simplified directory structure');
    
    // Process each date
    for (const date of dates) {
      if (date.files.length === 0) continue; // Skip dates with no files
      
      // Create date entry
      const dateSection = document.createElement('div');
      dateSection.className = 'directory-section';
      
      // Create date header
      const dateHeader = document.createElement('div');
      dateHeader.className = 'directory-header-wrapper';
      dateHeader.textContent = date.displayName;
      dateSection.appendChild(dateHeader);
      
      // Create date content container
      const dateContent = document.createElement('div');
      dateContent.className = 'directory-content-container';
      dateSection.appendChild(dateContent);
      
      // Process each file in this date
      for (const file of date.files) {
        // Create file section
        const fileSection = document.createElement('div');
        fileSection.className = 'directory-section';
        
        // Create file header
        const fileHeader = document.createElement('div');
        fileHeader.className = 'directory-header-wrapper';
        fileHeader.textContent = file.title;
        fileHeader.addEventListener('click', () => {
          window.location.href = `index.html?path=${file.path}`;
        });
        fileSection.appendChild(fileHeader);
        
        // Fetch headers from the file
        const headers = await getFileHeaders(file.path);
        
        // Extract wikilinks and backticked spans using the external module
        let spans = { wikilinks: [], backticks: [] };
        if (window.spanExtractor && typeof window.spanExtractor.extractSpans === 'function') {
          spans = await window.spanExtractor.extractSpans(file.path);
        }
        
        // Check if span display is enabled in settings
        const spanSettings = window.appSettings && window.appSettings.get && 
                           window.appSettings.get().directory && 
                           window.appSettings.get().directory.spans;
        
        const spanEnabled = spanSettings ? spanSettings.enabled : true;
        
        // If we have headers, create file content
        if (headers.length > 0) {
          // Create content container for this file's headers
          const fileContent = document.createElement('div');
          fileContent.className = 'directory-content-container';
          fileSection.appendChild(fileContent);
          
          // Build a structure to track headers
          const headerElements = [];
          
          // Process headers based on their level
          headers.forEach((header, index) => {
            // Create section for this header
            const headerSection = document.createElement('div');
            headerSection.className = 'directory-section';
            
            // Create the header element
            const headerElement = document.createElement('div');
            headerElement.className = 'directory-header-wrapper';
            headerElement.textContent = header.text;
            
            // Add click handler
            const headerUrl = `index.html?path=${file.path}#${header.text.toLowerCase().replace(/\s+/g, '-')}`;
            headerElement.addEventListener('click', (e) => {
              e.stopPropagation();
              window.location.href = headerUrl;
            });
            
            // Create content container for any children
            const contentElement = document.createElement('div');
            contentElement.className = 'directory-content-container';
            
            // Store all information about this header
            headerElements.push({
              level: header.level,
              section: headerSection,
              header: headerElement,
              content: contentElement,
              text: header.text
            });
            
            // Add header to section
            headerSection.appendChild(headerElement);
            headerSection.appendChild(contentElement);
          });
          
          // Use the hierarchical span tree for displaying tags
          if (spanEnabled && spans && spans.tree && 
              window.spanExtractor && typeof window.spanExtractor.createNodeSpansContainer === 'function') {
            
            console.log('[TagDebug] Processing spans for file:', file.title);
            
            // Function to recursively add spans from the tree
            function addSpansFromTree(node, headerElements) {
              // For each node in the tree
              if (node.text !== 'Root') {
                // Normalize node text for comparison (lowercase, trim whitespace)
                const normalizedNodeText = node.text.toLowerCase().trim();
                
                // Find matching header in UI, using normalized comparison
                const matchingHeader = headerElements.find(h => 
                  h.text.toLowerCase().trim() === normalizedNodeText);
                
                if (matchingHeader) {
                  console.log('[TagDebug] Found matching header for:', node.text);
                  console.log('[TagDebug] Node has wikilinks:', node.wikilinks.length, 'backticks:', node.backticks.length);
                  
                  // Create and add spans for this node
                  const spansContainer = window.spanExtractor.createNodeSpansContainer(node, spanSettings);
                  if (spansContainer) {
                    console.log('[TagDebug] Adding spans container to header:', matchingHeader.text);
                    matchingHeader.content.appendChild(spansContainer);
                  } else {
                    console.log('[TagDebug] No spans container created for:', node.text);
                  }
                } else {
                  console.log('[TagDebug] No matching header found for:', node.text);
                }
              } else if (node.text === 'Root' && headerElements.length > 0 && node.wikilinks.length + node.backticks.length > 0) {
                // For root node (content before first header), add to first header
                console.log('[TagDebug] Processing Root node, wikilinks:', node.wikilinks.length, 'backticks:', node.backticks.length);
                const spansContainer = window.spanExtractor.createNodeSpansContainer(node, spanSettings);
                if (spansContainer) {
                  console.log('[TagDebug] Adding Root spans to first header:', headerElements[0].text);
                  headerElements[0].content.appendChild(spansContainer);
                }
              }
              
              // Process children recursively
              if (node.children && node.children.length) {
                console.log('[TagDebug] Processing', node.children.length, 'children of', node.text || 'Root');
                node.children.forEach(child => {
                  addSpansFromTree(child, headerElements);
                });
              }
            }
            
            // Log full tree structure for debugging
            console.log('[TagDebug] Full tree structure:', JSON.stringify(spans.tree, (key, value) => {
              // Exclude parent to avoid circular reference and content to reduce size
              if (key === 'parent' || key === 'content') return undefined;
              return value;
            }, 2));
            
            // Log header elements for debugging
            console.log('[TagDebug] UI Header elements:', headerElements.map(h => ({
              text: h.text,
              level: h.level
            })));
            
            // Start from the root of the span tree
            addSpansFromTree(spans.tree, headerElements);
          }
          
          // Build the hierarchy (determine where each header should be placed)
          for (let i = 0; i < headerElements.length; i++) {
            const current = headerElements[i];
            
            if (i === 0 || current.level === 2) {
              // First header or level 2 header goes directly in file content
              fileContent.appendChild(current.section);
            } else {
              // Find the appropriate parent for this header
              let parentFound = false;
              
              // Look backward to find the closest header with a lower level
              for (let j = i - 1; j >= 0 && !parentFound; j--) {
                const potential = headerElements[j];
                
                if (potential.level < current.level) {
                  // Found a parent - add this header to its content
                  potential.content.appendChild(current.section);
                  parentFound = true;
                }
              }
              
              // If no parent found, add to file content
              if (!parentFound) {
                fileContent.appendChild(current.section);
              }
            }
          }
        } else {
          // No headers, but we might still want to show tags if they exist
          if (spanEnabled && spans && spans.tree && 
              window.spanExtractor && typeof window.spanExtractor.createNodeSpansContainer === 'function') {
            
            // Get the root node which contains all spans when no headers exist
            const rootNode = spans.tree;
            
            console.log('[TagDebug] No headers case - Root node has wikilinks:', 
              rootNode.wikilinks?.length || 0, 'backticks:', rootNode.backticks?.length || 0);
            
            if (rootNode && (rootNode.wikilinks.length > 0 || rootNode.backticks.length > 0)) {
              // Create a simple content container for the file to hold the spans
              const fileContent = document.createElement('div');
              fileContent.className = 'directory-content-container';
              
              const spansContainer = window.spanExtractor.createNodeSpansContainer(rootNode, spanSettings);
              
              if (spansContainer) {
                console.log('[TagDebug] Adding spans container in no-headers case');
                fileContent.appendChild(spansContainer);
                fileSection.appendChild(fileContent);
              } else {
                console.log('[TagDebug] No spans container created in no-headers case');
              }
            }
          }
        }
        
        // Add completed file section to date content
        dateContent.appendChild(fileSection);
      }
      
      // Add completed date section to post container
      postContainer.appendChild(dateSection);
    }
    
    debugLog('Directory view initialization completed with simplified structure');
    
    // Apply recursive styling after the directory structure is built
    if (window.recursiveStyling && typeof window.recursiveStyling.apply === 'function') {
      debugLog('Applying recursive styling to directory');
      // Call twice with a delay to ensure proper application
      window.recursiveStyling.apply();
      setTimeout(window.recursiveStyling.apply, 300);
    } else {
      debugLog('Recursive styling not available');
    }
    
  } catch (error) {
    debugLog(`Error in initDirectoryView: ${error.message}`);
    console.error('Error initializing directory view:', error);
    
    // Try to display an error message
    const postContainer = document.getElementById('post-container') || document.querySelector('.content') || document.body;
    if (postContainer) {
      postContainer.innerHTML = `
        <div class="directory-error-message">
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