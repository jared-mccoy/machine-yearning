/**
 * UI Controls and Theming
 * Handles theme toggling, animation controls, and other UI interactions
 */

// Initialize theme based on saved preference or system preference
function initTheme() {
  // Check for saved theme preference or use prefer-color-scheme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Check for saved animation preference
  const animationEnabled = localStorage.getItem('animationEnabled');
  if (animationEnabled !== null) {
    document.documentElement.setAttribute('data-animation', animationEnabled === 'true' ? 'enabled' : 'disabled');
  } else {
    // Default to enabled
    document.documentElement.setAttribute('data-animation', 'enabled');
  }
}

// Set up theme toggle functionality
function setupThemeToggle() {
  const toggleButton = document.getElementById('theme-toggle');
  if (!toggleButton) return;
  
  // Toggle theme on button click
  toggleButton.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

// Set up animation toggle functionality
function setupAnimationToggle() {
  const animationToggle = document.getElementById('animation-toggle');
  if (!animationToggle) return;
  
  // Set initial toggle state
  const animationState = document.documentElement.getAttribute('data-animation') || 'enabled';
  const toggleClass = animationState === 'enabled' ? 'enabled' : 'disabled';
  animationToggle.setAttribute('data-state', toggleClass);
  
  // Toggle animation on button click
  animationToggle.addEventListener('click', function() {
    const currentState = document.documentElement.getAttribute('data-animation') || 'enabled';
    const newState = currentState === 'enabled' ? 'disabled' : 'enabled';
    
    document.documentElement.setAttribute('data-animation', newState);
    localStorage.setItem('animationEnabled', newState === 'enabled');
    
    // Update toggle button state
    animationToggle.setAttribute('data-state', newState === 'enabled' ? 'enabled' : 'disabled');
  });
}

// Initialize on page load 
document.addEventListener('DOMContentLoaded', function() {
  // Apply theme immediately
  initTheme();
  
  // Set up toggles after DOM is ready
  setupThemeToggle();
  setupAnimationToggle();
});

// Expose methods for use in other scripts
window.themeControls = {
  initTheme,
  setupThemeToggle,
  setupAnimationToggle
}; 