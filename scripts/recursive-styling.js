/**
 * Recursive Styling for Directory Structure
 * Dynamically adjusts styling based on nesting depth
 */

function applyRecursiveStyling() {
  // Base values for level 0 (top level)
  const baseValues = {
    borderWidth: 1,      // px
    borderRadius: 6,     // px
    padding: 8,          // px
    marginBottom: 8,     // px
    fontSize: 1,         // rem - using relative units for text
    scaleFactor: 0.85    // Reduction factor per level
  };
  
  // Find the top-level directory container
  const container = document.querySelector('.directory-container');
  if (!container) return;
  
  // Process the tree recursively starting at the top level with depth 0
  processLevel(container, 0);
  
  function processLevel(element, depth) {
    // Calculate scaling for this depth
    const scale = Math.pow(baseValues.scaleFactor, depth);
    
    // Find all direct child sections within this element
    const sections = Array.from(element.children).filter(
      child => child.classList.contains('directory-section')
    );
    
    // Apply styling to each section
    sections.forEach(section => {
      // Calculate values for this depth
      const borderWidth = Math.max(1, Math.round(baseValues.borderWidth * scale));
      const borderRadius = Math.max(2, Math.round(baseValues.borderRadius * scale));
      const marginBottom = Math.max(2, Math.round(baseValues.marginBottom * scale));
      const padding = Math.max(2, Math.round(baseValues.padding * scale));
      const fontSize = baseValues.fontSize * (1 - (0.05 * depth)); // Gradual text size reduction
      
      // Apply border and spacing styling
      section.style.borderWidth = `${borderWidth}px`;
      section.style.borderRadius = `${borderRadius}px`;
      section.style.marginBottom = `${marginBottom}px`;
      
      // Style the header elements
      const headerWrapper = section.querySelector('.directory-header-wrapper');
      if (headerWrapper) {
        headerWrapper.style.padding = `${padding}px`;
        headerWrapper.style.fontSize = `${fontSize}rem`;
      }
      
      // Style the content container
      const contentContainer = section.querySelector('.directory-content-container');
      if (contentContainer) {
        contentContainer.style.padding = `0 ${padding}px ${padding}px ${padding}px`;
        
        // Recursively process the next level
        processLevel(contentContainer, depth + 1);
      }
    });
  }
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
  if (window.debugLog) {
    window.debugLog('Initializing recursive styling');
  }
  
  // Apply initial styling after a short delay to ensure DOM is ready
  setTimeout(applyRecursiveStyling, 100);
  
  // Also apply styling when window is resized
  window.addEventListener('resize', debounce(applyRecursiveStyling, 200));
}

// Make functions globally available
window.recursiveStyling = {
  init: initRecursiveStyling,
  apply: applyRecursiveStyling
};

// Auto-initialize after directory view is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.debugLog) {
    window.debugLog('Setting up recursive styling initialization');
  }
  
  // Check if we can find the directory container
  const checkAndInit = () => {
    const container = document.querySelector('.directory-container');
    if (container) {
      initRecursiveStyling();
    } else {
      // Try again in a moment
      setTimeout(checkAndInit, 100);
    }
  };
  
  // Start checking
  checkAndInit();
}); 