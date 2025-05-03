/**
 * Chat Directory Scanner
 * Dynamically discovers all chat files in the content directory
 */

// Add base URL config to handle both local and GitHub Pages environments
const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : '/machine-yearning';

// Add more detailed logging
console.debug(`Running on ${window.location.hostname} with baseUrl set to: "${baseUrl}"`);
console.debug(`Full current URL: ${window.location.href}`);

class ChatDirectoryScanner {
  constructor() {
    this.chats = [];
    this.dates = [];
    this.isLoading = false;
    this.cacheKey = 'machine-yearning-chats';
    this.cacheDuration = 3600000; // 1 hour in milliseconds
    
    // Clear the cache on page load to force a fresh scan
    this.clearCache();
    
    // Log constructor completion
    if (typeof window.debugLog === 'function') {
      window.debugLog('ChatDirectoryScanner constructor completed');
    } else {
      console.debug('ChatDirectoryScanner constructor completed');
    }
  }
  
  // Clear the browser cache for this app
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      if (window.debugLog) {
        window.debugLog('Chat scanner cache cleared');
      } else {
        console.debug('Chat scanner cache cleared');
      }
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
  }

  /**
   * Initialize the scanner
   * @returns {Promise} Resolves when scan is complete
   */
  async init() {
    const log = (msg) => {
      if (typeof window.debugLog === 'function') {
        window.debugLog(msg);
      } else {
        console.debug(msg);
      }
    };
    
    log('ChatDirectoryScanner.init() called');
    
    // Check for cached data first
    const cachedData = this.loadFromCache();
    if (cachedData) {
      log('Using cached directory data');
      this.dates = cachedData.dates;
      this.chats = cachedData.chats;
      return Promise.resolve(this.dates);
    }

    // If no cached data, scan the directory
    log('No cache found, scanning directory');
    return this.scanChatDirectory().catch(error => {
      log(`Directory scan error: ${error.message}`);
      
      // Display a user-friendly error on the page
      const postContainer = document.getElementById('post-container');
      if (postContainer) {
        postContainer.innerHTML = `
          <div class="error-message" style="padding: 16px; margin: 16px; background: #ffeeee; border: 1px solid #cc0000; color: #cc0000;">
            <strong>Error loading conversations:</strong> ${error.message}<br><br>
            <p>Please check that:</p>
            <ul>
              <li>Your content directory exists and contains markdown files</li>
              <li>The Jekyll server is running properly</li>
              <li>There are no JavaScript errors in the console</li>
            </ul>
          </div>
        `;
      }
      
      // Return empty result
      return [];
    });
  }

  /**
   * Attempt to load data from cache
   * @returns {Object|null} Cached data or null if no valid cache exists
   */
  loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const timestamp = data.timestamp || 0;
      const now = Date.now();

      // Check if cache is still valid
      if (now - timestamp < this.cacheDuration) {
        return data;
      }
      
      return null;
    } catch (e) {
      console.warn('Failed to load from cache:', e);
      return null;
    }
  }

  /**
   * Save data to cache
   */
  saveToCache() {
    try {
      const data = {
        dates: this.dates,
        chats: this.chats,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to cache:', e);
    }
  }

  /**
   * Scan the content directory to find all conversation files
   * @returns {Promise} Resolves with an array of date objects
   */
  async scanChatDirectory() {
    if (this.isLoading) {
      return new Promise(resolve => {
        // Poll until loading is complete
        const checkLoading = () => {
          if (!this.isLoading) {
            resolve(this.dates);
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    this.isLoading = true;
    this.dates = [];
    this.chats = [];
    
    const logMsg = (msg) => {
      if (window.debugLog) {
        window.debugLog(msg);
      } else {
        console.debug(msg);
      }
    };

    try {
      logMsg('Starting to scan content directory');
      
      // Try to use the API first
      try {
        const apiUrl = `${baseUrl}/api.json`;
        logMsg(`Fetching chat list from API: ${apiUrl}`);
        console.debug(`Full API URL being fetched: ${apiUrl}`);
        console.debug(`Document location: ${document.location.href}`);
        
        // Use relative path that works on both GitHub Pages and locally
        const apiResponse = await fetch(apiUrl);
        console.debug(`API response status: ${apiResponse.status}`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          logMsg(`Received API data with ${apiData.chats.length} files`);
          
          // Process files from API
          await this.processFilesFromApi(apiData.chats);
          this.isLoading = false;
          return this.dates;
        } else {
          logMsg(`API not available (status ${apiResponse.status}), falling back to directory scanning`);
        }
      } catch (apiError) {
        console.error('API error details:', apiError);
        logMsg(`API error: ${apiError.message}, falling back to directory scanning`);
      }
      
      // Fallback: Fetch the content directory
      const contentUrl = `${baseUrl}/content/`;
      logMsg(`Fetching content directory listing: ${contentUrl}`);
      console.debug(`Full content URL being fetched: ${contentUrl}`);
      
      // Use relative path that works on both GitHub Pages and locally
      const response = await fetch(contentUrl);
      console.debug(`Content directory response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content directory: ${response.status}`);
      }

      const html = await response.text();
      logMsg(`Received content directory listing (${html.length} chars)`);
      const dateDirs = this.parseDateDirectories(html);
      logMsg(`Found ${dateDirs.length} date directories: ${dateDirs.join(', ')}`);

      // Process each date directory
      const datePromises = dateDirs.map(async dateDir => {
        const dateObj = {
          name: dateDir,
          displayName: dateDir,
          files: []
        };

        // Fetch the date directory
        const dateResponse = await fetch(`${baseUrl}/content/${dateDir}/`);
        if (!dateResponse.ok) {
          return dateObj;
        }

        const dateHtml = await dateResponse.text();
        const chatFiles = this.parseChatFiles(dateHtml, dateDir);
        
        // Add additional metadata for each file
        const filePromises = chatFiles.map(async file => {
          const fileData = {
            path: file.path,
            title: file.filename.replace('.md', ''),
            originalFilename: file.filename  // Store original filename for sorting
          };

          // Try to extract the title from the file
          try {
            const fileResponse = await fetch(`${baseUrl}/${file.path}`);
            if (fileResponse.ok) {
              const markdown = await fileResponse.text();
              const titleMatch = markdown.match(/^#\s+(.+)$/m);
              if (titleMatch) {
                fileData.title = titleMatch[1].trim();
              }
            }
          } catch (e) {
            console.warn(`Failed to extract title from ${file.path}:`, e);
          }

          this.chats.push(fileData);
          return fileData;
        });

        dateObj.files = await Promise.all(filePromises);
        
        // Sort files by their original filename
        dateObj.files.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
        
        return dateObj;
      });

      this.dates = await Promise.all(datePromises);
      this.dates.sort((a, b) => b.name.localeCompare(a.name)); // Sort in reverse chronological order
      this.saveToCache();
      this.isLoading = false;
      return this.dates;
    } catch (error) {
      console.error('Error scanning chat directory:', error);
      this.isLoading = false;
      return [];
    }
  }
  
  /**
   * Process files from the API response
   * @param {Array} files Array of file objects from the API
   */
  async processFilesFromApi(files) {
    // Group files by date
    const dateMap = {};
    
    // Create an array of promises for fetching file contents
    const filePromises = files.map(async file => {
      // Extract date from path (assuming path format like "content/2025.04.15/file.md")
      const pathParts = file.path.split('/');
      if (pathParts.length >= 2) {
        const dateDir = pathParts[1];
        
        // Skip non-markdown files
        if (!file.name.endsWith('.md')) return null;
        
        // Create date entry if it doesn't exist
        if (!dateMap[dateDir]) {
          dateMap[dateDir] = {
            name: dateDir,
            displayName: dateDir,
            files: []
          };
        }
        
        // Create the file data object with filename as default title
        const fileData = {
          path: file.path,
          title: file.name.replace('.md', ''),
          originalFilename: file.name  // Store original filename for sorting
        };
        
        // Try to extract title from the file content
        try {
          const fileResponse = await fetch(`${baseUrl}/${file.path}`);
          if (fileResponse.ok) {
            const markdown = await fileResponse.text();
            const titleMatch = markdown.match(/^#\s+(.+)$/m);
            if (titleMatch) {
              fileData.title = titleMatch[1].trim();
            }
          }
        } catch (e) {
          console.warn(`Failed to extract title from ${file.path}:`, e);
        }
        
        // Add to the date's files array
        dateMap[dateDir].files.push(fileData);
        return fileData;
      }
      return null;
    });
    
    // Wait for all file processing to complete
    const processedFiles = await Promise.all(filePromises);
    
    // Add valid files to the chats array
    this.chats = processedFiles.filter(file => file !== null);
    
    // Sort files in each date directory
    Object.values(dateMap).forEach(dateObj => {
      dateObj.files.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
    });
    
    // Convert map to array
    this.dates = Object.values(dateMap);
    
    // Sort dates in reverse chronological order
    this.dates.sort((a, b) => b.name.localeCompare(a.name));
    
    // Save to cache
    this.saveToCache();
  }

  /**
   * Parse HTML from the content directory to find date subdirectories
   * @param {string} html HTML content of the content directory
   * @returns {Array} Array of date directory names
   */
  parseDateDirectories(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    
    // Find directories (they end with /)
    return links
      .filter(link => {
        const href = link.getAttribute('href');
        return href && href.endsWith('/') && !href.startsWith('..') && href !== './';
      })
      .map(link => {
        let href = link.getAttribute('href');
        // Remove trailing slash
        if (href.endsWith('/')) {
          href = href.slice(0, -1);
        }
        return href;
      });
  }

  /**
   * Parse HTML from a date directory to find markdown files
   * @param {string} html HTML content of a date directory
   * @param {string} dateDir Name of the date directory
   * @returns {Array} Array of file objects with path and filename
   */
  parseChatFiles(html, dateDir) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    
    // Find markdown files
    return links
      .filter(link => {
        const href = link.getAttribute('href');
        return href && href.endsWith('.md') && !href.startsWith('..') && href !== './';
      })
      .map(link => {
        const filename = link.getAttribute('href');
        return {
          path: `content/${dateDir}/${filename}`,
          filename
        };
      });
  }

  /**
   * Get a flat array of all chat files
   * @returns {Array} Array of chat file objects
   */
  getAllChats() {
    return this.chats;
  }

  /**
   * Find the previous and next chats relative to a given path
   * @param {string} currentPath Path of the current chat
   * @returns {Object} Object with prev and next properties
   */
  getNavigation(currentPath) {
    const index = this.chats.findIndex(chat => chat.path === currentPath);
    
    let prev = null;
    let next = null;
    
    if (index > 0) {
      prev = this.chats[index - 1];
    }
    
    if (index !== -1 && index < this.chats.length - 1) {
      next = this.chats[index + 1];
    }
    
    return { prev, next };
  }
}

// Create a global instance
window.chatScanner = new ChatDirectoryScanner(); 