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
  
  // Clear any existing inline styles first
  clearExistingStyles(container);
  
  // Process the tree recursively starting at the top level with depth 0
  processLevel(container, 0);
  
  // Helper function to clear existing inline styles
  function clearExistingStyles(element) {
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
      section.style.marginBottom = `${marginBottom}rem`;
      
      // Style the header elements
      const headerWrapper = section.querySelector('.directory-header-wrapper');
      if (headerWrapper) {
        headerWrapper.style.padding = `${verticalPadding}rem ${horizontalPadding}rem`;
        headerWrapper.style.fontSize = `${fontSize}rem`;
      }
      
      // Style the content container
      const contentContainer = section.querySelector('.directory-content-container');
      if (contentContainer) {
        contentContainer.style.padding = `0 ${horizontalPadding}rem ${verticalPadding}rem`;
        
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
  
  // Check if we can find the directory container
  const checkAndInit = () => {
    const container = document.querySelector('.directory-container');
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