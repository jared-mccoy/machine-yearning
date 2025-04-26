/**
 * Span Extractor
 * Extracts wikilinks and backticked spans from markdown content
 * for display in the directory view
 */

// Module for extracting wikilinks and backticked spans from markdown content
const spanExtractor = (function() {
  /**
   * Extract wikilinks and backticked spans from markdown content
   * @param {string} filePath - Path to the markdown file
   * @returns {Object} Object containing wikilinks and backticks arrays
   */
  async function extractSpans(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        return { wikilinks: [], backticks: [] };
      }
      
      const markdown = await response.text();
      
      // Split markdown into lines to properly handle code fences
      const lines = markdown.split('\n');
      
      // Extract wikilinks (e.g., [[wikilink]])
      const wikilinks = extractWikilinks(markdown);
      
      // Extract backticked spans while properly handling code fences
      const backticks = extractBackticks(lines);
      
      // Count occurrences and sort by frequency
      const wikilinksCount = countOccurrences(wikilinks);
      const backticksCount = countOccurrences(backticks);
      
      return { 
        wikilinks: wikilinksCount,
        backticks: backticksCount
      };
    } catch (error) {
      console.error(`Error extracting spans from ${filePath}:`, error);
      return { wikilinks: [], backticks: [] };
    }
  }
  
  /**
   * Extract wikilinks from markdown text
   * @param {string} markdown - Markdown content
   * @returns {Array} Array of wikilinks
   */
  function extractWikilinks(markdown) {
    const wikiRegex = /\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g;
    const wikilinks = [];
    let wikiMatch;
    
    while ((wikiMatch = wikiRegex.exec(markdown)) !== null) {
      wikilinks.push(wikiMatch[1].trim());
    }
    
    return wikilinks;
  }
  
  /**
   * Extract backticked spans from markdown lines
   * @param {Array} lines - Markdown content split into lines
   * @returns {Array} Array of backticked spans
   */
  function extractBackticks(lines) {
    const backticks = [];
    let inCodeBlock = false;
    
    // Process each line, tracking whether we're inside a code block
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for code fence markers (``` or ~~~)
      if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      // Skip extracting backticks inside code blocks
      if (!inCodeBlock) {
        // Extract inline code spans
        const codeRegex = /`([^`]+)`/g;
        let codeMatch;
        
        while ((codeMatch = codeRegex.exec(line)) !== null) {
          const content = codeMatch[1].trim();
          // Only include spans with meaningful content (more than 1 character)
          if (content.length > 1) {
            backticks.push(content);
          }
        }
      }
    }
    
    return backticks;
  }
  
  /**
   * Count occurrences of items and sort by frequency
   * @param {Array} items - Array of items to count
   * @returns {Array} Array of [item, count] pairs sorted by count
   */
  function countOccurrences(items) {
    const counts = {};
    
    // Count occurrences
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    // Convert to array of [item, count] pairs and sort by count (descending)
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);
  }
  
  /**
   * Create a spans container for the directory view
   * @param {Object} spans - Object containing wikilinks and backticks arrays
   * @param {Object} settings - Settings for span display
   * @returns {HTMLElement} Spans container element
   */
  function createSpansContainer(spans, settings) {
    // Parse settings with defaults
    const maxWikilinks = settings && settings.maxWikilinks !== undefined ? settings.maxWikilinks : 10;
    const maxBackticks = settings && settings.maxBackticks !== undefined ? settings.maxBackticks : 10;
    const minCount = settings && settings.minCount !== undefined ? settings.minCount : 1;
    const showCounts = settings && settings.showCounts !== undefined ? settings.showCounts : true;
    
    // Create spans container
    const spansContainer = document.createElement('div');
    spansContainer.className = 'directory-spans-container';
    
    // Add wikilinks
    if (spans.wikilinks.length > 0) {
      const wikiContainer = document.createElement('div');
      wikiContainer.className = 'directory-wikilinks';
      
      spans.wikilinks
        .filter(([_, count]) => count >= minCount)
        .slice(0, maxWikilinks)
        .forEach(([link, count]) => {
          const span = document.createElement('span');
          span.className = 'directory-tag wiki-tag';
          span.textContent = link;
          if (count > 1 && showCounts) {
            span.title = `Occurs ${count} times`;
            span.setAttribute('data-count', count);
          }
          wikiContainer.appendChild(span);
        });
      
      if (wikiContainer.children.length > 0) {
        spansContainer.appendChild(wikiContainer);
      }
    }
    
    // Add backticked spans
    if (spans.backticks.length > 0) {
      const codeContainer = document.createElement('div');
      codeContainer.className = 'directory-backticks';
      
      spans.backticks
        .filter(([_, count]) => count >= minCount)
        .slice(0, maxBackticks)
        .forEach(([code, count]) => {
          const span = document.createElement('span');
          span.className = 'directory-tag code-tag';
          span.textContent = code;
          if (count > 1 && showCounts) {
            span.title = `Occurs ${count} times`;
            span.setAttribute('data-count', count);
          }
          codeContainer.appendChild(span);
        });
      
      if (codeContainer.children.length > 0) {
        spansContainer.appendChild(codeContainer);
      }
    }
    
    return spansContainer;
  }
  
  // Expose public methods
  return {
    extractSpans,
    createSpansContainer
  };
})();

// Make methods available globally
window.spanExtractor = spanExtractor; 