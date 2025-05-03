/**
 * Simple Logging System
 * Override console methods immediately with default production setting
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Default logging configuration (production mode)
let loggingMode = 'production';
let allowedLevels = ['warning', 'error', 'critical'];

// Override console methods immediately
function overrideConsole() {
  // Log - treat as debug level
  console.log = function(message, ...args) {
    if (allowedLevels.includes('debug')) {
      originalConsole.log(message, ...args);
    }
  };
  
  // Debug level
  console.debug = function(message, ...args) {
    if (allowedLevels.includes('debug')) {
      originalConsole.debug(message, ...args);
    }
  };
  
  // Info level
  console.info = function(message, ...args) {
    if (allowedLevels.includes('info')) {
      originalConsole.info(message, ...args);
    }
  };
  
  // Warning level
  console.warn = function(message, ...args) {
    if (allowedLevels.includes('warning')) {
      originalConsole.warn(message, ...args);
    }
  };
  
  // Error level
  console.error = function(message, ...args) {
    if (allowedLevels.includes('error') || allowedLevels.includes('critical')) {
      originalConsole.error(message, ...args);
    }
  };
}

// Apply overrides immediately
overrideConsole();

// Check for settings in localStorage first (for faster loading)
try {
  const savedSettings = localStorage.getItem('appSettings');
  if (savedSettings) {
    const settings = JSON.parse(savedSettings);
    if (settings.logging && settings.logging.mode && settings.logging.levels) {
      loggingMode = settings.logging.mode;
      allowedLevels = settings.logging.levels[loggingMode] || allowedLevels;
      originalConsole.info(`[Logging] Using cached settings, mode: ${loggingMode}`);
    }
  }
} catch (e) {
  // Ignore errors reading from localStorage
}

// Global appLog object for direct use
window.appLog = {
  debug: (message, ...data) => {
    if (allowedLevels.includes('debug')) {
      originalConsole.debug(`[DEBUG] ${message}`, ...data);
    }
  },
  info: (message, ...data) => {
    if (allowedLevels.includes('info')) {
      originalConsole.info(`[INFO] ${message}`, ...data);
    }
  },
  warning: (message, ...data) => {
    if (allowedLevels.includes('warning')) {
      originalConsole.warn(`[WARNING] ${message}`, ...data);
    }
  },
  error: (message, ...data) => {
    if (allowedLevels.includes('error')) {
      originalConsole.error(`[ERROR] ${message}`, ...data);
    }
  },
  critical: (message, ...data) => {
    if (allowedLevels.includes('critical')) {
      originalConsole.error(`[CRITICAL] ${message}`, ...data);
    }
  },
  
  // Update logging configuration
  setMode: function(mode, levels) {
    loggingMode = mode;
    allowedLevels = levels[mode] || allowedLevels;
    originalConsole.info(`[Logging] Mode set to: ${mode}, levels: ${allowedLevels.join(', ')}`);
  },
  
  // Access to original console
  original: originalConsole
}; 