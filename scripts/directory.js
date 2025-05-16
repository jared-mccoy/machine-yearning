/**
 * Chat Directory Scanner
 * Dynamically discovers all chat files in the content directory
 */

// Add base URL config to handle both local and GitHub Pages environments
const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? '' 
  : '/machine-yearning';

// Add more detailed logging
if (window.appLog) {
  appLog.info(`Running on ${window.location.hostname} with baseUrl set to: "${baseUrl}"`);
  appLog.info(`Full current URL: ${window.location.href}`);
} else {
  console.info(`Running on ${window.location.hostname} with baseUrl set to: "${baseUrl}"`);
  console.info(`Full current URL: ${window.location.href}`);
}

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
    if (window.appLog) {
      appLog.debug('ChatDirectoryScanner constructor completed');
    } else {
      console.info('ChatDirectoryScanner constructor completed');
    }
  }
  
  // Clear the browser cache for this app
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      if (window.appLog) {
        appLog.debug('Chat scanner cache cleared');
      } else {
        console.info('Chat scanner cache cleared');
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
      if (window.appLog) {
        appLog.debug(msg);
      } else {
        console.info(msg);
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
      if (window.appLog) {
        appLog.debug(msg);
      } else {
        console.info(msg);
      }
    };

    try {
      logMsg('Starting to scan content directory');
      
      // Define known date directories (expand this list as needed)
      const dateDirs = ['2025.04.15'];
      logMsg(`Using known date directories: ${dateDirs.join(', ')}`);
      
      // Process each date directory
      const datePromises = dateDirs.map(async dateDir => {
        const dateObj = {
          name: dateDir,
          displayName: dateDir,
          files: []
        };

        // Define potential file patterns in each directory
        // Specific patterns based on your existing files
        const filePatterns = [
          `${dateDir}.A.md`, 
          `${dateDir}.B.md`, 
          `${dateDir}.C.md`, 
          `${dateDir}.D.md`,
          'TEST.md'  // Add TEST.md explicitly
        ];
        
        logMsg(`Checking for files in ${dateDir}: ${filePatterns.join(', ')}`);
        
        // Check each possible file
        const filePromises = filePatterns.map(async filename => {
          const path = `content/${dateDir}/${filename}`;
          try {
            logMsg(`Checking if file exists: ${path}`);
            const response = await fetch(`${baseUrl}/${path}`);
            if (!response.ok) {
              logMsg(`File does not exist: ${path}`);
              return null;
            }
            
            logMsg(`File exists: ${path}`);
            const fileData = {
              path: path,
              title: filename.replace('.md', ''),
              originalFilename: filename
            };
            
            // Extract title if possible
            try {
              const markdown = await response.text();
              const titleMatch = markdown.match(/^#\s+(.+)$/m);
              if (titleMatch) {
                fileData.title = titleMatch[1].trim();
                logMsg(`Extracted title from ${filename}: ${fileData.title}`);
              }
            } catch (e) {
              logMsg(`Failed to extract title from ${path}: ${e.message}`);
            }
            
            this.chats.push(fileData);
            return fileData;
          } catch (e) {
            logMsg(`Error checking file ${path}: ${e.message}`);
            return null;
          }
        });
        
        // Wait for all file checks to complete
        const files = (await Promise.all(filePromises)).filter(f => f !== null);
        
        // Sort files by filename
        files.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
        
        dateObj.files = files;
        logMsg(`Found ${files.length} files in ${dateDir}`);
        
        return dateObj;
      });
      
      this.dates = await Promise.all(datePromises);
      
      // Filter out empty date directories
      this.dates = this.dates.filter(date => date.files.length > 0);
      
      // Sort dates in reverse chronological order
      this.dates.sort((a, b) => b.name.localeCompare(a.name));
      
      logMsg(`Processed ${this.dates.length} date directories with a total of ${this.chats.length} files`);
      
      this.saveToCache();
    } catch (error) {
      console.error('Error scanning chat directory:', error);
      logMsg(`Scan error: ${error.message}`);
      this.isLoading = false;
      throw error;
    }
    
    this.isLoading = false;
    return this.dates;
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