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
    const maxTags = settings && settings.maxTags !== undefined ? settings.maxTags : 15;
    const wikiTagsRatio = settings && settings.wikiTagsRatio !== undefined ? settings.wikiTagsRatio : 0.6;
    const codeTagsRatio = settings && settings.codeTagsRatio !== undefined ? settings.codeTagsRatio : 0.4;
    const minCount = settings && settings.minCount !== undefined ? settings.minCount : 1;
    const showCounts = settings && settings.showCounts !== undefined ? settings.showCounts : true;
    
    // Create spans container
    const spansContainer = document.createElement('div');
    spansContainer.className = 'directory-spans-container';
    
    // Create a single container for all tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'directory-tags';
    
    // Filter spans that meet the minimum count requirement
    const filteredWikilinks = spans.wikilinks.filter(([_, count]) => count >= minCount);
    const filteredBackticks = spans.backticks.filter(([_, count]) => count >= minCount);
    
    // Calculate how many of each type to include based on ratios
    // If one type has fewer items than its allocation, give the extras to the other type
    const totalItems = filteredWikilinks.length + filteredBackticks.length;
    
    let maxWikiTags = Math.round(maxTags * wikiTagsRatio);
    let maxCodeTags = Math.round(maxTags * codeTagsRatio);
    
    // Adjust if we have fewer items of one type
    if (filteredWikilinks.length < maxWikiTags) {
      maxCodeTags += (maxWikiTags - filteredWikilinks.length);
      maxWikiTags = filteredWikilinks.length;
    }
    
    if (filteredBackticks.length < maxCodeTags) {
      maxWikiTags += (maxCodeTags - filteredBackticks.length);
      maxCodeTags = filteredBackticks.length;
    }
    
    // Ensure we don't exceed the limits
    maxWikiTags = Math.min(maxWikiTags, filteredWikilinks.length);
    maxCodeTags = Math.min(maxCodeTags, filteredBackticks.length);
    
    // Prepare combined array of all spans with their types
    const allSpans = [];
    
    // Add wikilinks with type indicator
    filteredWikilinks
      .slice(0, maxWikiTags)
      .forEach(([link, count]) => {
        allSpans.push({
          text: link,
          count: count,
          type: 'wiki'
        });
      });
    
    // Add backticked spans with type indicator
    filteredBackticks
      .slice(0, maxCodeTags)
      .forEach(([code, count]) => {
        allSpans.push({
          text: code,
          count: count,
          type: 'code'
        });
      });
    
    // Sort all spans by count (descending)
    allSpans.sort((a, b) => b.count - a.count);
    
    // Create spans in the unified container
    allSpans.forEach(span => {
      const spanElement = document.createElement('span');
      spanElement.className = `directory-tag ${span.type === 'wiki' ? 'wiki-tag' : 'code-tag'}`;
      spanElement.textContent = span.text;
      
      if (span.count > 1 && showCounts) {
        spanElement.title = `${span.text} (${span.count})`;
        spanElement.setAttribute('data-count', span.count);
      }
      
      tagsContainer.appendChild(spanElement);
    });
    
    // Only add the container if it has children
    if (tagsContainer.children.length > 0) {
      spansContainer.appendChild(tagsContainer);
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