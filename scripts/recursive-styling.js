/**
 * Recursive Styling for Directory Structure
 * Dynamically adjusts styling based on nesting depth
 */

function applyRecursiveStyling() {
  // Base values for level 0 (top level)
  const baseValues = {
    borderWidth: 3,      // px - increased initial thickness
    borderRadius: 8,     // px - increased initial radius
    padding: 12,         // px - increased initial padding
    marginBottom: 12,    // px - increased initial margin
    fontSize: 1,         // rem - using relative units for text
    scaleFactor: 0.7     // Reduction factor per level - more aggressive scaling
  };
  
  // Find the top-level directory container
  const container = document.querySelector('.directory-container');
  if (!container) {
    console.error('Directory container not found');
    return;
  }
  
  console.log('Applying recursive styling to:', container);
  
  // Clear any existing inline styles first to ensure clean application
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
  
  // Recursive function to process each level of nesting
  function processLevel(element, depth) {
    // Calculate scaling for this depth
    const scale = Math.pow(baseValues.scaleFactor, depth);
    
    // Find all direct child sections within this element
    const sections = Array.from(element.children).filter(
      child => child.classList.contains('directory-section')
    );
    
    console.log(`Processing ${sections.length} sections at depth ${depth}`);
    
    // Apply styling to each section
    sections.forEach((section, index) => {
      // Calculate values for this depth
      const borderWidth = Math.max(1, Math.round(baseValues.borderWidth * scale));
      const borderRadius = Math.max(2, Math.round(baseValues.borderRadius * scale));
      const marginBottom = Math.max(2, Math.round(baseValues.marginBottom * scale));
      const padding = Math.max(2, Math.round(baseValues.padding * scale));
      const fontSize = baseValues.fontSize * (1 - (0.05 * depth)); // Gradual text size reduction
      
      console.log(`Section ${index} at depth ${depth}: border=${borderWidth}px, radius=${borderRadius}px`);
      
      // Apply border and spacing styling with !important to override existing styles
      section.style.setProperty('border-width', `${borderWidth}px`, 'important');
      section.style.setProperty('border-style', 'solid', 'important');
      section.style.setProperty('border-radius', `${borderRadius}px`, 'important');
      section.style.setProperty('margin-bottom', `${marginBottom}px`, 'important');
      
      // Style the header elements
      const headerWrapper = section.querySelector('.directory-header-wrapper');
      if (headerWrapper) {
        headerWrapper.style.setProperty('padding', `${padding}px`, 'important');
        headerWrapper.style.setProperty('font-size', `${fontSize}rem`, 'important');
      }
      
      // Style the content container
      const contentContainer = section.querySelector('.directory-content-container');
      if (contentContainer) {
        contentContainer.style.setProperty('padding', `0 ${padding}px ${padding}px ${padding}px`, 'important');
        
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
  console.log('Initializing recursive styling');
  
  // Apply initial styling after a short delay to ensure DOM is ready
  setTimeout(applyRecursiveStyling, 500); // Increased delay to ensure DOM is ready
  
  // Also apply styling when window is resized
  window.addEventListener('resize', debounce(applyRecursiveStyling, 200));
  
  // Force reapply when debug button is clicked
  const applyButton = document.getElementById('apply-styling');
  if (applyButton) {
    applyButton.addEventListener('click', function() {
      console.log('Manual reapply of recursive styling triggered by button');
      applyRecursiveStyling();
    });
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