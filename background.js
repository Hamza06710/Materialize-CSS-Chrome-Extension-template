
<<<<<<< HEAD
let activeTabId = 0; // ID of the currently active tab
let activeTabStartTime = 0; // Start time of the active tab
=======
let activeTabId = null; // ID of the currently active tab
let activeTabStartTime = null; // Start time of the active tab
>>>>>>> 0a41a6d6e21e9487c60cf74fe4adcbba8b499b7c
const usageData = {}; // Object to store usage data

// Save usage data to chrome.storage
function saveUsageData() {
  chrome.storage.local.set({ usage: usageData }, () => {
    console.log("Usage data updated:", usageData);
  });
}

// Record time spent on a tab
function recordTabTime(tabId) {
  if (!tabId || !activeTabStartTime) return;

  const elapsedTime = Math.round((Date.now() - activeTabStartTime) / 1000 / 60); // Convert to minutes
  if (elapsedTime > 0) {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab || !tab.url) return;

      // Extract the hostname from the URL
      const url = new URL(tab.url);
      const hostname = url.hostname;

      // Update the usage data
      if (!usageData[hostname]) {
        usageData[hostname] = 0;
      }
      usageData[hostname] += elapsedTime;

      saveUsageData();
    });
  }

  activeTabStartTime = null; // Reset start time
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  // Record time spent on the previous tab
  recordTabTime(activeTabId);

  // Update the active tab and start time
  activeTabId = activeInfo.tabId;
  activeTabStartTime = Date.now();
});

// Listen for tab updates (e.g., navigating to a new URL in the same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === "complete") {
    // Record time spent on the old URL before navigating
    recordTabTime(tabId);
    activeTabStartTime = Date.now(); // Reset start time for the new URL
  }
});

// Listen for when a tab is removed (closed)
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    // Record time spent before the tab is closed
    recordTabTime(tabId);
    activeTabId = null;
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser unfocused (e.g., minimized or user switched to another application)
    recordTabTime(activeTabId);
    activeTabId = null;
  } else {
    // Browser focused
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        activeTabStartTime = Date.now();
      }
    });
  }
});

// Initialize usage data on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["usage"], (data) => {
    if (data.usage) {
      Object.assign(usageData, data.usage);
    }
  });
});

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
  recordTabTime(activeTabId);
});

