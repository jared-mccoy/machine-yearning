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

// Available color sets (matching existing theme colors)
const SPEAKER_COLORS = [
  'user',      // Reserved for 'user' 
  'assistant', // Reserved for 'agent', 'assistant', 'test'
  'speakerc',  // First dynamic color
  'speakerd',  // Second dynamic color
  'speakere',  // Third dynamic color
  'generic'    // Fallback color
];

// Global map to track speakers and their assigned icons
let speakerIconMap = new Map();

// Global map to track speakers and their assigned colors
let speakerColorMap = new Map();

// Track speaker assignment order
let speakerAssignmentOrder = [];

// Keep a list of custom speaker icons 
let customSpeakerIcons = new Set();

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
  speakerIconMap.clear();
  speakerColorMap.clear();
  speakerAssignmentOrder = [];
  customSpeakerIcons.clear();
  logDebug('Speaker icon and color mapping reset');
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
  
  // Note: We've removed the dynamic assignment logic since we're 
  // now prioritizing direct speaker name matching over the dynamic mapping
}

/**
 * Get the appropriate color key for a speaker based on order of appearance
 * @param {string} speaker - The speaker identifier
 * @returns {string} The color key to use for this speaker (matches CSS class name)
 */
export function getSpeakerColor(speaker) {
  logDebug(`Getting color for speaker: ${speaker}`);
  
  // Special case: direct-text spans don't need special color
  if (speaker === 'direct-text') {
    logDebug('Direct-text spans get default color');
    speakerColorMap.set(speaker, 'direct-text');
    return 'direct-text';
  }
  
  // If we've seen this speaker before, return its assigned color
  if (speakerColorMap.has(speaker)) {
    logDebug(`Returning previously assigned color: ${speakerColorMap.get(speaker)}`);
    return speakerColorMap.get(speaker);
  }
  
  // Special case: 'user' always gets user color
  if (speaker === 'user') {
    logDebug(`Assigning 'user' color to 'user'`);
    speakerColorMap.set(speaker, 'user');
    return 'user';
  }
  
  // Special case: 'agent' or 'assistant' always gets assistant color
  if (speaker === 'agent' || speaker === 'assistant' || speaker === 'test') {
    logDebug(`Assigning 'assistant' color to '${speaker}'`);
    speakerColorMap.set(speaker, 'assistant');
    return 'assistant';
  }
  
  // Assign a specific color key based on position in assignment queue
  const preferredColorKeys = ['speakerc', 'speakerd', 'speakere']; 
  
  // For custom icon speakers, cycle through the available colors
  // Find position in assignment order
  const position = speakerAssignmentOrder.indexOf(speaker);
  
  // Use position to select a color
  let colorKey = 'generic'; // default fallback
  
  if (position >= 0) {
    // Calculate color index based on position 
    // Position is offset by any 'user' and 'assistant' entries
    // Starting at speakerc, speakerd, speakere and cycling
    const colorIndex = position % preferredColorKeys.length;
    colorKey = preferredColorKeys[colorIndex];
    logDebug(`Assigned color '${colorKey}' based on position ${position}`);
  }
  
  // Add to map
  speakerColorMap.set(speaker, colorKey);
  logDebug(`Mapped speaker ${speaker} to color ${colorKey}`);
  return colorKey;
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