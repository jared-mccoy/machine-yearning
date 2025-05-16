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

// Global map to track speakers and their assigned icons
let speakerIconMap = new Map();

/**
 * Reset the speaker icon mapping
 * Should be called at the start of any new chat processing
 */
export function resetSpeakerIconMapping() {
  speakerIconMap.clear();
}

/**
 * Get the appropriate icon for a speaker based on order of appearance
 * @param {string} speaker - The speaker identifier
 * @returns {string} The icon name to use for this speaker
 */
export function getSpeakerIcon(speaker) {
  // Special case: 'user' is always User_A
  if (speaker === 'user' && !speakerIconMap.has(speaker)) {
    speakerIconMap.set(speaker, 'User_A');
    return 'User_A';
  }
  
  // Special case: 'agent' or 'assistant' is always Agent_A
  if ((speaker === 'agent' || speaker === 'assistant' || speaker === 'test') && !speakerIconMap.has(speaker)) {
    speakerIconMap.set(speaker, 'Agent_A');
    return 'Agent_A';
  }
  
  // If we've seen this speaker before, return its assigned icon
  if (speakerIconMap.has(speaker)) {
    return speakerIconMap.get(speaker);
  }
  
  // New speaker - assign next available icon
  const currentSpeakerCount = speakerIconMap.size;
  let iconName = 'empty'; // Default to empty if we run out of icons
  
  // Skip the first two slots which are reserved for user and agent
  const specialSpeakersCount = speakerIconMap.has('user') ? 1 : 0 
    + (speakerIconMap.has('agent') || speakerIconMap.has('assistant') || speakerIconMap.has('test') ? 1 : 0);
    
  // Calculate which icon to use, starting from User_B onwards for additional speakers
  const adjustedCount = currentSpeakerCount - specialSpeakersCount + 1; // +1 to start from B
  
  if (adjustedCount < USER_ICONS.length) {
    // Use available user icons first
    iconName = USER_ICONS[adjustedCount];
  } else {
    // Then use agent icons if we have more speakers
    const agentIconIndex = (adjustedCount - USER_ICONS.length + 1) % AGENT_ICONS.length;
    if (agentIconIndex < AGENT_ICONS.length) {
      iconName = AGENT_ICONS[agentIconIndex];
    }
  }
  
  // Add to map
  speakerIconMap.set(speaker, iconName);
  return iconName;
}

/**
 * Get the current speaker icon mapping for debugging
 * @returns {Map} The current speaker to icon mapping
 */
export function getSpeakerIconMapping() {
  return new Map(speakerIconMap);
} 