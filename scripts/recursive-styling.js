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
  
  // Final pass - ensure all spans-buffer elements have hover effects
  ensureAllBuffersHaveHoverEffects();
  
  // Final handler to ensure any buffer elements have hover delegation
  function ensureAllBuffersHaveHoverEffects() {
    // Find all span buffers in the document
    const allBuffers = document.querySelectorAll('.spans-buffer');
    
    allBuffers.forEach(buffer => {
      // Find the parent section
      const parentSection = buffer.closest('.directory-section');
      if (parentSection) {
        // Add hover delegation to the buffer
        addHoverDelegation(buffer, parentSection);
      }
    });
    
    // Also add a mutation observer to handle any dynamically added buffers
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Check if this is a buffer
              if (node.classList && node.classList.contains('spans-buffer')) {
                const section = node.closest('.directory-section');
                if (section) {
                  addHoverDelegation(node, section);
                }
              }
              
              // Also check for buffers inside this node
              const innerBuffers = node.querySelectorAll ? node.querySelectorAll('.spans-buffer') : [];
              Array.from(innerBuffers).forEach(buffer => {
                const section = buffer.closest('.directory-section');
                if (section) {
                  addHoverDelegation(buffer, section);
                }
              });
            }
          });
        }
      });
    });
    
    // Start observing the directory container for changes
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }
  }
  
  // Helper function to clear existing styles and buffer elements
  function clearExistingStyles(element) {
    // Loop through all sections first to capture parent-child relationships
    const sections = element.querySelectorAll('.directory-section');
    const sectionMap = new Map(); // Map to store section references
    
    // Store sections by their DOM path for later reference
    sections.forEach(section => {
      const path = getDomPath(section);
      sectionMap.set(path, section);
    });
    
    // Helper to get DOM path for an element
    function getDomPath(el) {
      let path = '';
      while (el && el !== document.body) {
        let selector = el.tagName.toLowerCase();
        if (el.id) {
          selector += '#' + el.id;
        } else {
          let siblings = Array.from(el.parentNode.children);
          let index = siblings.indexOf(el) + 1;
          selector += `:nth-child(${index})`;
        }
        path = selector + (path ? ' > ' + path : '');
        el = el.parentNode;
      }
      return path;
    }
    
    // Remove any existing buffer elements that don't need to be kept
    const buffers = element.querySelectorAll('.spans-buffer');
    buffers.forEach(buffer => buffer.remove());
    
    // Also remove any existing event listeners to prevent duplicates
    sections.forEach(section => {
      const oldSection = section.cloneNode(true);
      section.parentNode.replaceChild(oldSection, section);
    });
    
    const refreshedSections = element.querySelectorAll('.directory-section');
    refreshedSections.forEach(section => {
      section.style.borderWidth = '';
      section.style.borderRadius = '';
      section.style.marginBottom = '';
      
      // Explicitly remove any transform or transition styles
      section.style.transition = '';
      section.style.transform = '';
      
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
          
          // Find the parent section for this buffer and add hover delegation
          const parentSection = container.closest('.directory-section');
          if (parentSection) {
            // Add hover delegation to this buffer element
            addHoverDelegation(buffer, parentSection);
          }
          
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
    const sections = Array.from(element.children).filter(
      child => child.classList.contains('directory-section')
    );
    
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
      
      // Remove any inline transform/transition styles
      section.style.transition = '';
      section.style.transform = '';
      
      // Enhanced hover effect delegation
      setupSectionHoverEffects(section);
      
      // Only apply margin-bottom if this is NOT the last section
      if (index < sections.length - 1) {
        section.style.marginBottom = `${marginBottom}rem`;
      } else {
        section.style.marginBottom = '0';
      }
      
      // Style the header elements
      const headerWrapper = section.querySelector('.directory-header-wrapper');
      if (headerWrapper) {
        headerWrapper.style.padding = `${verticalPadding}rem ${horizontalPadding}rem`;
        headerWrapper.style.fontSize = `${fontSize}rem`;
      }
      
      // Get the content container
      const contentContainer = section.querySelector('.directory-content-container');
      
      // Check if this is a leaf node (no directory sections inside)
      const isLeafNode = !contentContainer || !Array.from(contentContainer.children).some(
        child => child.classList.contains('directory-section')
      );
      
      // Style the content container, adjusting padding based on content
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
  
  // New helper function to set up hover effects for a section and all its children
  function setupSectionHoverEffects(section) {
    // Main section hover handlers
    section.addEventListener('mouseenter', (event) => {
      // Only handle direct events on the section itself (not bubbled)
      if (event.target === section) {
        event.stopPropagation();
        
        // Clear all hover states
        const allSections = document.querySelectorAll('.directory-section');
        allSections.forEach(sect => sect.classList.remove('hover-active'));
        
        // Set this section as active
        section.classList.add('hover-active');
      }
    });
    
    section.addEventListener('mouseleave', (event) => {
      // Only handle direct events on the section itself (not bubbled)
      if (event.target === section) {
        event.stopPropagation();
        
        // Only remove if we're not moving to a child
        if (!section.contains(event.relatedTarget)) {
          section.classList.remove('hover-active');
        }
      }
    });
    
    // Find ALL direct children that aren't sections themselves
    const directChildren = Array.from(section.children).filter(
      child => !child.classList.contains('directory-section')
    );
    
    // Process each direct child
    directChildren.forEach(child => {
      // Add hover delegation for the direct child
      addHoverDelegation(child, section);
      
      // And also process all descendants recursively
      addHoverDelegationToDescendants(child, section);
    });
  }
  
  // Add hover delegation to a single element
  function addHoverDelegation(element, parentSection) {
    element.addEventListener('mouseenter', (event) => {
      event.stopPropagation();
      
      // Clear all hover states
      const allSections = document.querySelectorAll('.directory-section');
      allSections.forEach(sect => sect.classList.remove('hover-active'));
      
      // Set parent section as active
      parentSection.classList.add('hover-active');
    });
    
    element.addEventListener('mouseleave', (event) => {
      event.stopPropagation();
      
      // Only remove if we're not moving to another element within the same section
      if (!parentSection.contains(event.relatedTarget)) {
        parentSection.classList.remove('hover-active');
      }
    });
  }
  
  // Process all descendants of an element recursively
  function addHoverDelegationToDescendants(element, parentSection) {
    // Process all children
    Array.from(element.children).forEach(child => {
      // Skip if this is a section (those have their own hover handlers)
      if (!child.classList.contains('directory-section')) {
        // Add delegation to this child
        addHoverDelegation(child, parentSection);
        
        // Process its descendants recursively
        addHoverDelegationToDescendants(child, parentSection);
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