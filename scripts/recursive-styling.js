/**
 * Recursive Styling for Directory Structure
 * Dynamically adjusts styling based on nesting depth using proportional scaling
 */

function applyRecursiveStyling() {
  // Calculate root font size for relative calculations
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
  
  // Get styling configuration from app settings
  const config = getRecursiveStylingConfig();
  
  // Find the top-level directory container
  const container = document.querySelector('.directory-container');
  if (!container) {
    console.error('Directory container not found');
    return;
  }
  
  console.log('Applying recursive styling with root font size:', rootFontSize + 'px');
  console.log('Using config:', config);
  
  // Clear any existing inline styles first and remove any existing buffer elements
  clearExistingStyles(container);
  
  // Process the tree recursively starting at the top level with depth 0
  processLevel(container, 0);
  
  // Add buffer elements where needed
  addBufferElements(container);
  
  // Helper function to clear existing styles and buffer elements
  function clearExistingStyles(element) {
    // Remove any existing buffer elements
    const buffers = element.querySelectorAll('.spans-buffer');
    buffers.forEach(buffer => buffer.remove());
    
    const sections = element.querySelectorAll('.directory-section');
    sections.forEach(section => {
      section.style.borderWidth = '';
      section.style.borderRadius = '';
      section.style.marginBottom = '';
      
      const header = section.querySelector('.directory-header-wrapper');
      if (header) {
        header.style.padding = '';
        header.style.fontSize = '';
      }
      
      const content = section.querySelector('.directory-content-container');
      if (content) {
        content.style.padding = '';
      }

      // Clear tag styles thoroughly
      const tags = section.querySelectorAll('.directory-tag');
      tags.forEach(tag => {
        // Reset all possible style properties
        tag.style.fontSize = '';
        tag.style.padding = '';
        tag.style.borderRadius = '';
        tag.style.borderWidth = '';
        tag.style.borderStyle = '';
        tag.style.margin = '';
        tag.style.height = '';
        tag.style.width = '';
      });
    });
    
    // Also look for any tags in spans containers that might be outside sections
    const extraTags = element.querySelectorAll('.directory-spans-container .directory-tag');
    extraTags.forEach(tag => {
      tag.style.fontSize = '';
      tag.style.padding = '';
      tag.style.borderRadius = '';
      tag.style.borderWidth = '';
      tag.style.borderStyle = '';
      tag.style.margin = '';
      tag.style.height = '';
      tag.style.width = '';
    });
  }
  
  // Helper function to add buffer elements between spans containers and directory sections
  function addBufferElements(rootElement) {
    // Process all content containers to find spans containers
    const contentContainers = rootElement.querySelectorAll('.directory-content-container');
    
    contentContainers.forEach(container => {
      const children = Array.from(container.children);
      
      // Find spans containers that are followed by directory sections
      for (let i = 0; i < children.length - 1; i++) {
        const current = children[i];
        const next = children[i + 1];
        
        if (current.classList.contains('directory-spans-container') && 
            next.classList.contains('directory-section')) {
          console.log('Found spans container followed by directory section - adding buffer');
          
          // Find the depth of this content container
          let depth = 0;
          let parent = container;
          while (parent && !parent.classList.contains('directory-container')) {
            if (parent.classList.contains('directory-content-container')) {
              depth++;
            }
            parent = parent.parentElement;
          }
          depth = Math.max(0, depth - 1); // Adjust depth to be 0-based
          
          // Calculate the appropriate buffer size based on depth
          const verticalPadding = calculateValue(config.base.verticalPadding, config.scale.spacing, depth);
          
          // Create buffer element
          const buffer = document.createElement('div');
          buffer.className = 'spans-buffer';
          buffer.style.height = `${verticalPadding}rem`;
          buffer.style.width = '100%';
          
          // Insert buffer after the spans container
          current.after(buffer);
          
          // Skip the next element as we've already processed it
          i++;
        }
      }
    });
  }
  
  // Calculate a value based on depth using the appropriate scale factor
  function calculateValue(baseValue, scaleFactor, depth) {
    return baseValue * Math.pow(scaleFactor, depth);
  }
  
  // Convert rem to px for exact calculations
  function remToPx(remValue) {
    return remValue * rootFontSize;
  }
  
  // Recursive function to process each level of nesting
  function processLevel(element, depth) {
    // Find all direct child sections within this element
    const sections = Array.from(element.children).filter(
      child => child.classList.contains('directory-section')
    );
    
    console.log(`Processing ${sections.length} sections at depth ${depth}`);
    
    // Apply styling to each section
    sections.forEach((section, index) => {
      // Calculate values for this depth using appropriate scaling factors
      const borderWidth = calculateValue(config.base.borderWidth, config.scale.borderWidth, depth);
      const borderRadius = calculateValue(config.base.borderRadius, config.scale.borderRadius, depth);
      const marginBottom = calculateValue(config.base.marginBottom, config.scale.spacing, depth);
      const verticalPadding = calculateValue(config.base.verticalPadding, config.scale.spacing, depth);
      const horizontalPadding = calculateValue(config.base.horizontalPadding, config.scale.spacing, depth);
      const fontSize = calculateValue(config.base.fontSize, config.scale.fontSize, depth);
      
      // Log calculated values in pixels for debugging
      console.log(`Section ${index} at depth ${depth}:`, {
        borderWidth: remToPx(borderWidth) + 'px',
        borderRadius: remToPx(borderRadius) + 'px',
        fontSize: remToPx(fontSize) + 'px'
      });
      
      // Apply border styling
      section.style.borderWidth = `${borderWidth}rem`;
      section.style.borderStyle = 'solid';
      section.style.borderRadius = `${borderRadius}rem`;
      
      // Only apply margin-bottom if this is NOT the last section
      if (index < sections.length - 1) {
        section.style.marginBottom = `${marginBottom}rem`;
      } else {
        section.style.marginBottom = '0'; // Explicitly set to 0 for the last section
      }
      
      // Style the header elements
      const headerWrapper = section.querySelector('.directory-header-wrapper');
      if (headerWrapper) {
        headerWrapper.style.padding = `${verticalPadding}rem ${horizontalPadding}rem`;
        headerWrapper.style.fontSize = `${fontSize}rem`;
      }
      
      // Style the content container, adjusting padding based on content
      const contentContainer = section.querySelector('.directory-content-container');
      if (contentContainer) {
        // Only apply bottom padding if the container has elements
        const hasContent = contentContainer.children.length > 0;
        
        if (hasContent) {
          contentContainer.style.padding = `0 ${horizontalPadding}rem ${verticalPadding}rem`;
        } else {
          contentContainer.style.padding = `0 ${horizontalPadding}rem 0`;
        }

        // ---- TAG STYLING BY DEPTH ----
        // Find all tags within this content container
        const tags = contentContainer.querySelectorAll('.directory-tag');
        if (tags.length > 0) {
          // Tag config (can be customized in getRecursiveStylingConfig)
          const tagBase = config.tag && config.tag.base ? config.tag.base : {
            fontSize: 0.85,    // rem - start smaller than section text
            paddingV: 0.15,    // rem
            paddingH: 0.4,     // rem
            borderRadius: 0.25, // rem
            borderWidth: 0.08,  // rem - thin border for tags
            margin: 0           // rem - no margin as we're using buffers
          };
          const tagScale = config.tag && config.tag.scale ? config.tag.scale : {
            fontSize: 0.9,    // scale down slightly faster than sections
            padding: 0.9,
            borderRadius: 0.9,
            borderWidth: 0.8,  // scale border width more dramatically like sections
            margin: 0.9
          };

          // Calculate tag values for this depth
          const tagFontSize = calculateValue(tagBase.fontSize, tagScale.fontSize, depth);
          const tagPaddingV = calculateValue(tagBase.paddingV, tagScale.padding, depth);
          const tagPaddingH = calculateValue(tagBase.paddingH, tagScale.padding, depth);
          const tagBorderRadius = calculateValue(tagBase.borderRadius, tagScale.borderRadius, depth);
          const tagBorderWidth = calculateValue(tagBase.borderWidth, tagScale.borderWidth, depth);
          
          console.log(`Styling ${tags.length} tags at depth ${depth} with fontSize: ${tagFontSize}rem, borderWidth: ${tagBorderWidth}rem`);

          // Apply styles to each tag
          tags.forEach(tag => {
            tag.style.fontSize = `${tagFontSize}rem`;
            tag.style.padding = `${tagPaddingV}rem ${tagPaddingH}rem`;
            tag.style.borderRadius = `${tagBorderRadius}rem`;
            tag.style.setProperty('border-width', `${tagBorderWidth}rem`, 'important');
            tag.style.borderStyle = 'solid';
            tag.style.margin = '0'; // Remove margin from tags
            
            // For wiki tags that don't have a visual border, add border offset as padding to maintain consistent sizing
            if (tag.classList.contains('wiki-tag')) {
              // Set border width to 0 to override the important setting above
              tag.style.setProperty('border-width', '0', 'important');
              // Add the border width to padding on all sides to maintain consistent sizing
              const adjustedPaddingV = tagPaddingV + tagBorderWidth;
              const adjustedPaddingH = tagPaddingH + tagBorderWidth;
              tag.style.padding = `${adjustedPaddingV}rem ${adjustedPaddingH}rem`;
            }
          });
        }
        
        // Recursively process the next level
        processLevel(contentContainer, depth + 1);
      }
    });
  }
}

/**
 * Get the recursive styling configuration from app settings
 * Uses defaults if settings are not available
 */
function getRecursiveStylingConfig() {
  // Default config
  const defaultConfig = {
    base: {
      borderWidth: 0.125,         // rem - ~2px at 16px root font size
      borderRadius: 0.375,        // rem
      verticalPadding: 0.75,      // rem
      horizontalPadding: 0.9,     // rem
      marginBottom: 0.75,         // rem
      fontSize: 1                 // rem - relative to parent
    },
    scale: {
      borderWidth: 0.8,           // Border width scales more dramatically
      borderRadius: 0.85,         // Border radius scales moderately
      spacing: 0.9,               // Padding and margins scale gently
      fontSize: 0.95              // Font size scales very gently
    },
    tag: {
      base: {
        fontSize: 0.85,           // rem - start smaller than section text
        paddingV: 0.15,           // rem
        paddingH: 0.4,            // rem
        borderRadius: 0.25,       // rem
        borderWidth: 0.08,        // rem - thin border for tags
        margin: 0                 // rem - no margin as we're using buffers
      },
      scale: {
        fontSize: 0.9,            // scale down slightly faster than sections
        padding: 0.9,
        borderRadius: 0.9,
        borderWidth: 0.8,         // scale border width more dramatically like sections
        margin: 0.9
      }
    }
  };
  
  // Try to get settings from the app settings
  if (window.appSettings && typeof window.appSettings.get === 'function') {
    const settings = window.appSettings.get();
    
    if (settings && settings.directory && settings.directory.recursiveStyling) {
      return settings.directory.recursiveStyling;
    }
  }
  
  return defaultConfig;
}

// Simple debounce function to limit excessive function calls
function debounce(func, wait) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
  };
}

// Hook into the directory view initialization
function initRecursiveStyling() {
  console.log('Initializing recursive styling');
  
  // Apply initial styling after a short delay to ensure DOM is ready
  setTimeout(applyRecursiveStyling, 500);
  
  // Also apply styling when window is resized
  window.addEventListener('resize', debounce(applyRecursiveStyling, 200));
  
  // Observe theme changes and reapply
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'data-theme') {
        setTimeout(applyRecursiveStyling, 200);
      }
    });
  });
  
  observer.observe(document.documentElement, { attributes: true });
  
  // Reapply when settings change
  if (window.addEventListener) {
    window.addEventListener('settingsChanged', applyRecursiveStyling);
  }
}

// Make functions globally available
window.recursiveStyling = {
  init: initRecursiveStyling,
  apply: applyRecursiveStyling
};

// Auto-initialize after directory view is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Setting up recursive styling initialization');
  console.log(`Current URL path: ${window.location.pathname}`);
  console.log(`Current search params: ${window.location.search}`);
  
  // Skip on chat pages - only run on directory pages
  if (window.location.search.includes('path=')) {
    console.log('On chat page - skipping recursive styling');
    return;
  }
  
  // Check if we can find the directory container
  const checkAndInit = () => {
    const container = document.querySelector('.directory-container');
    console.log(`Directory container attempt: ${container ? 'FOUND' : 'NOT FOUND'}`);
    
    // Let's log all elements on the page to see what's there
    console.log('Current DOM elements:', {
      'body children': document.body.children.length,
      'post-container': document.getElementById('post-container'),
      'post-container content': document.getElementById('post-container')?.innerHTML
    });
    
    if (container) {
      console.log('Directory container found, initializing styling');
      initRecursiveStyling();
    } else {
      console.log('Directory container not found yet, retrying...');
      // Try again in a moment
      setTimeout(checkAndInit, 200);
    }
  };
  
  // Start checking
  checkAndInit();
}); 