/**
 * Simple Logging System
 * Does NOT override console methods - just provides a clean logging interface
 */

// Ensure debugLog is defined immediately
window.debugLog = function(message, category = 'system') {
  console.log(`[DEBUG] ${message}`);
};

// Default logging configuration
let loggingMode = 'debug'; // Start with debug by default
let allowedLevels = ['debug', 'info', 'warning', 'error', 'critical'];

// Global appLog object for direct use
window.appLog = {
  // Core logging methods
  debug: (message, ...data) => {
    if (allowedLevels.includes('debug')) {
      console.log(`[DEBUG] ${message}`, ...data);
    }
  },
  
  info: (message, ...data) => {
    if (allowedLevels.includes('info')) {
      console.info(`[INFO] ${message}`, ...data);
    }
  },
  
  warning: (message, ...data) => {
    if (allowedLevels.includes('warning')) {
      console.warn(`[WARNING] ${message}`, ...data);
    }
  },
  
  error: (message, ...data) => {
    if (allowedLevels.includes('error')) {
      console.error(`[ERROR] ${message}`, ...data);
    }
  },
  
  critical: (message, ...data) => {
    if (allowedLevels.includes('critical')) {
      console.error(`[CRITICAL] ${message}`, ...data);
    }
  },
  
  // Update logging configuration
  setMode: function(mode, levels) {
    loggingMode = mode;
    allowedLevels = levels[mode] || allowedLevels;
    console.info(`[Logging] Mode set to: ${mode}, levels: ${allowedLevels.join(', ')}`);
    
    // Update the global debugLog function to respect logging levels
    window.debugLog = function(message, category = 'system') {
      if (allowedLevels.includes('debug')) {
        console.log(`[DEBUG] ${message}`);
      }
    };
  }
};

// Load settings right away
try {
  const savedSettings = localStorage.getItem('appSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    if (settings.logging && settings.logging.mode && settings.logging.levels) {
      loggingMode = settings.logging.mode;
      allowedLevels = settings.logging.levels[loggingMode] || allowedLevels;
      console.info(`[Logging] Using settings from storage, mode: ${loggingMode}, levels: ${allowedLevels.join(', ')}`);
      
      // Update debugLog immediately after loading settings
      if (!allowedLevels.includes('debug')) {
        window.debugLog = function() {}; // No-op if debug level isn't allowed
      }
    }
  } else {
    console.info('[Logging] No settings found in storage, using defaults');
  }
} catch (e) {
  console.warn('[Logging] Error loading settings:', e);
} 