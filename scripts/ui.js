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
  
  // Remove the flash prevention style if it exists
  const flashStyle = document.getElementById('theme-flash-prevention');
  if (flashStyle) {
    flashStyle.remove();
  }
  
  // Ensure Prism theme is correct
  if (typeof togglePrismTheme === 'function') {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    togglePrismTheme(currentTheme === 'dark');
  }
  
  // Check for saved animation preference - fallback to local storage if settings aren't loaded yet
  let animationEnabled;
  
  if (window.appSettings && window.appSettings.get) {
    // Use settings module if available
    animationEnabled = window.appSettings.get().chat.typingAnimation.enabled;
  } else {
    // Fallback to localStorage
    animationEnabled = localStorage.getItem('animationEnabled');
    if (animationEnabled !== null) {
      animationEnabled = animationEnabled === 'true';
    } else {
      // Default to enabled
      animationEnabled = true;
    }
  }
  
  document.documentElement.setAttribute('data-animation', animationEnabled ? 'enabled' : 'disabled');
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
    
    // Update theme in settings if available
    if (window.appSettings && window.appSettings.get) {
      const settings = window.appSettings.get();
      if (newTheme === 'light') {
        document.documentElement.style.setProperty('--assistant-color', settings.theme.accentA);
        document.documentElement.style.setProperty('--user-color', settings.theme.accentB);
      } else {
        // In dark mode, we swap the accents
        document.documentElement.style.setProperty('--assistant-color', settings.theme.accentB);
        document.documentElement.style.setProperty('--user-color', settings.theme.accentA);
      }
    }
  });
}

// Set up animation toggle functionality
function setupAnimationToggle() {
  const animationToggle = document.getElementById('animation-toggle');
  if (!animationToggle) return;
  
  // Set initial toggle state
  let animationState;
  
  if (window.appSettings && window.appSettings.get) {
    // Use settings module if available
    animationState = window.appSettings.get().chat.typingAnimation.enabled ? 'enabled' : 'disabled';
  } else {
    // Fallback to DOM attribute
    animationState = document.documentElement.getAttribute('data-animation') || 'enabled';
  }
  
  const toggleClass = animationState === 'enabled' ? 'enabled' : 'disabled';
  animationToggle.setAttribute('data-state', toggleClass);
  
  // Toggle animation on button click
  animationToggle.addEventListener('click', function() {
    const currentState = document.documentElement.getAttribute('data-animation') || 'enabled';
    const newState = currentState === 'enabled' ? 'disabled' : 'enabled';
    
    document.documentElement.setAttribute('data-animation', newState);
    localStorage.setItem('animationEnabled', newState === 'enabled');
    
    // Update settings if available
    if (window.appSettings && window.appSettings.get) {
      const settings = window.appSettings.get();
      settings.chat.typingAnimation.enabled = newState === 'enabled';
    }
    
    // Update toggle button state
    animationToggle.setAttribute('data-state', newState === 'enabled' ? 'enabled' : 'disabled');
    
    // Update animation state using the animation controller
    if (window.chatAnimations && window.chatAnimations.updateAnimationState) {
      window.chatAnimations.updateAnimationState(newState === 'enabled');
    }
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