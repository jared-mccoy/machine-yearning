/**
 * Speaker Icon Mapper Utility
 * Provides dynamic mapping of speakers to SVG icons based on order of appearance
 */

// Available icon sets
const USER_ICONS = [
  'User_A', 'User_B', 'User_C', 'User_D', 'User_E', 
  'User_F', 'User_G', 'User_H', 'User_I', 'User_J'
];

const AGENT_ICONS = [
  'Agent_A', 'Agent_B', 'Agent_C', 'Agent_D'
];

// Color mapping information
const ACCENT_COLORS = ['accentC', 'accentD', 'accentE']; // Available accent colors beyond user/assistant
const COLOR_CSS_MAP = {
  'accentA': 'assistant',
  'accentB': 'user',
  'accentC': 'speakerc',
  'accentD': 'speakerd',
  'accentE': 'speakere',
  'genericAccent': 'generic'
};

// Track speaker colors already used (to ensure uniqueness)
let usedColorKeys = [];

// All standard system speaker icons
const SYSTEM_ICONS = [...USER_ICONS, ...AGENT_ICONS];

// Global map to track speakers and their assigned icons
let speakerIconMap = new Map();

// Global map to track speakers and their assigned colors
let speakerColorMap = new Map();

// Track speaker assignment order
let speakerAssignmentOrder = [];

// Keep a list of custom speaker icons 
let customSpeakerIcons = new Set();

// Track speaker names that should display captions
let displaySpeakerNames = new Set();

// Debug logging
function logDebug(message) {
  if (window.debugLog) {
    window.debugLog(`[IconMapper] ${message}`, 'system');
  } else if (console) {
    console.log(`[IconMapper] ${message}`);
  }
}

/**
 * Reset the speaker icon mapping
 * Should be called at the start of any new chat processing
 */
export function resetSpeakerIconMapping() {
  // Completely clear all state
  speakerIconMap = new Map();
  speakerColorMap = new Map();
  speakerAssignmentOrder = [];
  customSpeakerIcons = new Set();
  displaySpeakerNames = new Set();
  usedColorKeys = []; // Reset used colors
  logDebug('Speaker icon and color mapping fully reset with new maps');
}

/**
 * Setup custom CSS rules for any custom speaker icons not in the standard sets
 * This is needed because CSS can't directly use data attributes with spaces in mask-image URLs
 */
export function setupCustomIconCSS() {
  // Skip if no custom icons
  if (customSpeakerIcons.size === 0) {
    return;
  }

  logDebug(`Setting up CSS for ${customSpeakerIcons.size} custom speaker icons`);

  // Create style element if needed
  let styleEl = document.getElementById('custom-speaker-icon-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-speaker-icon-styles';
    document.head.appendChild(styleEl);
  }
  
  // Build CSS rules for each custom icon
  let css = '';
  customSpeakerIcons.forEach(iconName => {
    // CSS selector needs to escape special characters
    const escapedIconName = CSS.escape(iconName);
    
    // For URL path, keep spaces intact but URL-encode them
    // This ensures spaces in the SVG filename are properly represented in the URL
    const urlPath = encodeURIComponent(iconName);
    logDebug(`Setting up CSS for icon: '${iconName}' (URL-encoded: '${urlPath}')`);
    
    // Add rule for message icons
    css += `
      .message[data-speaker-icon="${escapedIconName}"]::before {
        mask-image: url('../public/speaker_icons/${urlPath}.svg');
        -webkit-mask-image: url('../public/speaker_icons/${urlPath}.svg');
      }
    `;
    
    // Add rule for typing indicator icons
    css += `
      .typing-indicator[data-speaker-icon="${escapedIconName}"]::before {
        mask-image: url('../public/speaker_icons/${urlPath}.svg');
        -webkit-mask-image: url('../public/speaker_icons/${urlPath}.svg');
      }
    `;
  });
  
  // Debug the generated CSS
  logDebug(`Generated custom icon CSS rules: ${css}`);
  
  // Update the style element
  styleEl.textContent = css;
  logDebug('Custom icon CSS applied');
}

/**
 * Format speaker name for display as a caption
 * @param {string} name - The raw speaker name
 * @returns {string} Formatted speaker name in title case
 */
function formatSpeakerName(name) {
  // Convert to title case and handle special characters
  return name
    .split(/[\s_-]+/) // Split by spaces, underscores, or hyphens
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Check if a speaker name should display a caption
 * @param {string} speaker - The speaker name
 * @returns {boolean} True if this speaker should show a caption
 */
export function shouldDisplaySpeakerName(speaker) {
  return displaySpeakerNames.has(speaker);
}

/**
 * Get the formatted display name for a speaker
 * @param {string} speaker - The speaker name
 * @returns {string} Formatted display name
 */
export function getSpeakerDisplayName(speaker) {
  return formatSpeakerName(speaker);
}

/**
 * Get the appropriate icon for a speaker based on order of appearance
 * @param {string} speaker - The speaker identifier
 * @returns {string} The icon name to use for this speaker
 */
export function getSpeakerIcon(speaker) {
  logDebug(`Getting icon for speaker: ${speaker}`);
  
  // Special case: direct-text spans don't get icons
  if (speaker === 'direct-text') {
    logDebug('Direct-text spans get no icons, returning empty');
    speakerIconMap.set(speaker, 'empty');
    return 'empty';
  }
  
  // If we've seen this speaker before, return its assigned icon
  if (speakerIconMap.has(speaker)) {
    logDebug(`Returning previously assigned icon: ${speakerIconMap.get(speaker)}`);
    return speakerIconMap.get(speaker);
  }
  
  // Add to assignment order for tracking (excluding direct-text)
  if (speaker !== 'direct-text') {
    speakerAssignmentOrder.push(speaker);
    logDebug(`Speaker order: ${JSON.stringify(speakerAssignmentOrder)}`);
  }
  
  // Special case: 'user' is always User_A
  if (speaker === 'user') {
    logDebug(`Assigning User_A to 'user'`);
    speakerIconMap.set(speaker, 'User_A');
    return 'User_A';
  }
  
  // Special case: 'agent' or 'assistant' is always Agent_A
  if (speaker === 'agent' || speaker === 'assistant' || speaker === 'test') {
    logDebug(`Assigning Agent_A to '${speaker}'`);
    speakerIconMap.set(speaker, 'Agent_A');
    return 'Agent_A';
  }
  
  // Check if this speaker should have its name displayed
  // Display name if not a standard system speaker (not user, agent, etc.)
  // and not one of the common format patterns (User_X, Agent_X)
  const isStandardSpeaker = speaker === 'user' || 
                            speaker === 'agent' || 
                            speaker === 'assistant' || 
                            speaker === 'test';
                            
  const isSystemIconFormat = SYSTEM_ICONS.some(iconName => {
    // Check if speaker matches a system icon name pattern (e.g., User_A, Agent_B)
    const normalizedSpeaker = speaker.toLowerCase().replace(/[\s_-]/g, '');
    const normalizedIcon = iconName.toLowerCase().replace(/[\s_-]/g, '');
    return normalizedSpeaker === normalizedIcon;
  });
  
  // Display name for custom speakers
  if (!isStandardSpeaker && !isSystemIconFormat) {
    logDebug(`Speaker '${speaker}' will display name caption`);
    displaySpeakerNames.add(speaker);
  }
  
  // IMPORTANT: Try to use the exact speaker name as an icon first
  // This is the direct match case for custom icons like "trevor yn"
  const exactIconName = speaker;
  logDebug(`Attempting to use direct speaker name as icon: '${exactIconName}'`);
  
  // Add this to the custom icons set to generate CSS for it
  customSpeakerIcons.add(exactIconName);
  
  // Set up CSS for this custom icon
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(() => setupCustomIconCSS());
  } else {
    setTimeout(() => setupCustomIconCSS(), 0);
  }
  
  // Use the speaker name directly as the icon name
  speakerIconMap.set(speaker, exactIconName);
  logDebug(`Using direct speaker name as icon: '${exactIconName}'`);
  
  return exactIconName;
}

/**
 * Get the appropriate color key for a speaker based on order of appearance
 * @param {string} speaker - The speaker identifier
 * @returns {string} The color key to use for this speaker (matches CSS class name)
 */
export function getSpeakerColor(speaker) {
  logDebug(`Getting color for speaker: ${speaker}`);
  
  // Special cases first
  if (speaker === 'direct-text') {
    logDebug('Direct-text spans get default color');
    return 'direct-text';
  }
  
  if (speaker === 'user') {
    logDebug(`Assigning 'user' color to 'user'`);
    return 'user';
  }
  
  if (speaker === 'agent' || speaker === 'assistant' || speaker === 'test') {
    logDebug(`Assigning 'assistant' color to '${speaker}'`);
    return 'assistant';
  }
  
  // For each unique speaker, assign a color that hasn't been seen before
  // First ensure speakerColorMap is initialized
  if (!window.speakerUniqueColorMap) {
    window.speakerUniqueColorMap = new Map();
    window.usedColors = new Set();
    logDebug('Created global speaker color mapping');
  }
  
  // If this speaker already has a color, return it
  if (window.speakerUniqueColorMap.has(speaker)) {
    const color = window.speakerUniqueColorMap.get(speaker);
    logDebug(`Returning existing color '${color}' for speaker '${speaker}'`);
    return color;
  }
  
  // Get the next available color
  const availableColors = ['speakerc', 'speakerd', 'speakere'];
  let assignedColor = 'generic';
  
  // Look for an unused color
  for (const color of availableColors) {
    if (!window.usedColors.has(color)) {
      assignedColor = color;
      window.usedColors.add(color);
      logDebug(`Assigned unused color '${color}' to speaker '${speaker}'`);
      break;
    }
  }
  
  // Store the color for this speaker
  window.speakerUniqueColorMap.set(speaker, assignedColor);
  logDebug(`Set color '${assignedColor}' for speaker '${speaker}'`);
  
  return assignedColor;
}

/**
 * Get the current speaker icon mapping for debugging
 * @returns {Map} The current speaker to icon mapping
 */
export function getSpeakerIconMapping() {
  return new Map(speakerIconMap);
}

/**
 * Get the current speaker color mapping for debugging
 * @returns {Map} The current speaker to color mapping
 */
export function getSpeakerColorMapping() {
  return new Map(speakerColorMap);
} 