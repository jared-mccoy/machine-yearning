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
      
      // Try to discover all potential date directories
      // First, let's try to discover potential date directories by pattern matching
      // This approach doesn't rely on directory listings
      
      // For GitHub Pages, we'll use a date pattern matching approach
      // Look for directories in common date formats: YYYY.MM.DD, YYYY-MM-DD, etc.
      const currentDate = new Date();
      const potentialDirs = [];
      
      // Scan last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // Add various date formats - expand this as needed for your naming conventions
        potentialDirs.push(`${year}.${month}.${day}`);
        potentialDirs.push(`${year}-${month}-${day}`);
      }
      
      // Add any known specific directories
      potentialDirs.push('2025.04.15');
      
      // Remove duplicates
      const uniqueDirs = [...new Set(potentialDirs)];
      logMsg(`Checking for potential directories: ${uniqueDirs.length} possibilities`);
      
      // Check each potential directory to see if it exists
      const validDirPromises = uniqueDirs.map(async dirName => {
        // A directory "exists" if we can find at least one file in it
        // Try a few common patterns or existing files to test if directory exists
        const testPatterns = [
          `${dirName}.md`, // Common pattern for main file
          `${dirName}.A.md`, // Format in your existing files
          'index.md',
          'README.md'
        ];
        
        for (const pattern of testPatterns) {
          const testPath = `content/${dirName}/${pattern}`;
          try {
            const response = await fetch(`${baseUrl}/${testPath}`);
            if (response.ok) {
              logMsg(`Found valid directory: ${dirName}`);
              return dirName;
            }
          } catch (e) {
            // Ignore fetch errors
          }
        }
        
        return null;
      });
      
      const validDirs = (await Promise.all(validDirPromises)).filter(dir => dir !== null);
      logMsg(`Found ${validDirs.length} valid directories: ${validDirs.join(', ')}`);
      
      // Process each valid directory
      const datePromises = validDirs.map(async dateDir => {
        const dateObj = {
          name: dateDir,
          displayName: dateDir,
          files: []
        };

        // Instead of predefined patterns, try to discover all markdown files in the directory
        const foundFiles = await this.discoverFilesInDirectory(dateDir);
        dateObj.files = foundFiles;
        logMsg(`Found ${foundFiles.length} files in ${dateDir}`);
        
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
   * Discover all markdown files in a directory
   * @param {string} dirName Directory name
   * @returns {Promise<Array>} Array of file objects
   */
  async discoverFilesInDirectory(dirName) {
    const log = (msg) => {
      if (window.appLog) {
        appLog.debug(msg);
      } else {
        console.info(msg);
      }
    };
    
    log(`Discovering files in directory: ${dirName}`);
    
    // Basic approach: check for common files and patterns
    const knownPatterns = [
      // Common filenames
      'index.md', 'README.md', 
      // Common date-based patterns
      `${dirName}.md`, `${dirName}.A.md`, `${dirName}.B.md`, `${dirName}.C.md`, `${dirName}.D.md`,
      // Common prefixes (with wildcard handling by trying common suffixes)
      'chat.md', 'conversation.md', 'transcript.md',
      // Special test file
      'TEST.md'
    ];
    
    // For numeric suffixes, generate patterns like file-1.md, file-2.md, etc.
    for (let i = 1; i <= 10; i++) {
      knownPatterns.push(`chat-${i}.md`);
      knownPatterns.push(`conversation-${i}.md`);
    }
    
    // Also add alphabetic suffixes like A.md, B.md which are common
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alphabet.length; i++) {
      knownPatterns.push(`${alphabet[i]}.md`);
      knownPatterns.push(`${dirName}-${alphabet[i]}.md`);
    }
    
    log(`Checking ${knownPatterns.length} potential files in ${dirName}`);
    
    // Check if each potential file exists
    const filePromises = knownPatterns.map(async filename => {
      const path = `content/${dirName}/${filename}`;
      try {
        const response = await fetch(`${baseUrl}/${path}`);
        if (!response.ok) {
          return null;
        }
        
        log(`Found file: ${path}`);
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
            log(`Extracted title from ${filename}: ${fileData.title}`);
          }
        } catch (e) {
          log(`Failed to extract title from ${path}: ${e.message}`);
        }
        
        this.chats.push(fileData);
        return fileData;
      } catch (e) {
        return null;
      }
    });
    
    // Wait for all file checks to complete
    const files = (await Promise.all(filePromises)).filter(f => f !== null);
    
    // Sort files by filename
    files.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
    
    return files;
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