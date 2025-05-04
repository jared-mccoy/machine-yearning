// Add special handling for direct-text messages (empty speaker tags)
// This should be added where message animations are defined
if (message.dataset.speaker === 'direct-text') {
  // For direct-text elements, we just animate them in without typing or speaker effects
  message.classList.add('animate-in');
  
  // Use a simple fade-in animation without typing
  return new Promise(resolve => {
    setTimeout(() => {
      message.classList.add('visible');
      message.classList.remove('hidden');
      message.classList.remove('animate-in');
      resolve();
    }, 250); // Short transition
  });
} 