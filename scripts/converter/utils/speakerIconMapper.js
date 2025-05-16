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
  logDebug('Speaker icon and color mapping reset');
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
  
  // Find position in assignment order (0-indexed)
  const position = speakerAssignmentOrder.indexOf(speaker);
  logDebug(`Position in assignment order: ${position}`);
  
  // Calculate index in icon array - the 3rd unique speaker (at position 2) should get User_B (at index 1)
  // We exclude User_A since it's reserved for user
  const iconIndex = position - (speakerAssignmentOrder.includes('user') ? 1 : 0) - 
                    ((speakerAssignmentOrder.includes('agent') || 
                      speakerAssignmentOrder.includes('assistant') || 
                      speakerAssignmentOrder.includes('test')) ? 1 : 0);
  
  logDebug(`Icon index calculation: ${position} - ${speakerAssignmentOrder.includes('user') ? 1 : 0} - ${(speakerAssignmentOrder.includes('agent') || speakerAssignmentOrder.includes('assistant') || speakerAssignmentOrder.includes('test')) ? 1 : 0} = ${iconIndex}`);
  
  let iconName = 'empty';
  
  if (iconIndex < 0) {
    logDebug(`Negative icon index ${iconIndex}, setting to 0`);
    iconIndex = 0;
  }
  
  if (iconIndex < USER_ICONS.length - 1) { // -1 because User_A is reserved
    iconName = USER_ICONS[iconIndex + 1]; // +1 to skip User_A
    logDebug(`Using User icon at index ${iconIndex + 1}: ${iconName}`);
  } else {
    // Use Agent icons (skipping Agent_A which is reserved)
    const agentIndex = (iconIndex - (USER_ICONS.length - 1) + 1) % (AGENT_ICONS.length - 1);
    if (agentIndex < AGENT_ICONS.length - 1) {
      iconName = AGENT_ICONS[agentIndex + 1]; // +1 to skip Agent_A
      logDebug(`Using Agent icon at index ${agentIndex + 1}: ${iconName}`);
    }
  }
  
  // Add to map
  speakerIconMap.set(speaker, iconName);
  logDebug(`Mapped speaker ${speaker} to icon ${iconName}`);
  logDebug(`Updated map: ${JSON.stringify(Array.from(speakerIconMap.entries()))}`);
  return iconName;
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
  
  // Calculate color index based on position in assignment order
  const position = speakerAssignmentOrder.indexOf(speaker);
  logDebug(`Position in color assignment order: ${position}`);
  
  // Calculate index in color array (start from index 2 since 0 and 1 are reserved)
  const colorIndex = position - (speakerAssignmentOrder.includes('user') ? 1 : 0) - 
                    ((speakerAssignmentOrder.includes('agent') || 
                      speakerAssignmentOrder.includes('assistant') || 
                      speakerAssignmentOrder.includes('test')) ? 1 : 0);
  
  logDebug(`Color index calculation: ${colorIndex}`);
  
  // Assign a color from our predefined set, starting with speakerc (index 2)
  // If we run out of colors, use the generic color
  let colorKey = 'generic';
  if (colorIndex >= 0 && colorIndex + 2 < SPEAKER_COLORS.length) {
    colorKey = SPEAKER_COLORS[colorIndex + 2]; // +2 to skip the reserved colors
    logDebug(`Using color key at index ${colorIndex + 2}: ${colorKey}`);
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