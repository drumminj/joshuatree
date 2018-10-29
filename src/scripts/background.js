// Add an event-handler here that when it receives a message launches the options page
chrome.runtime.onMessage.addListener(() => chrome.runtime.openOptionsPage());
