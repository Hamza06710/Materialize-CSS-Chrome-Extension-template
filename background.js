let activeTabId = null; // ID of the currently active tab
let activeTabStartTime = null; // Start time of the active tab
const usageData = {}; // Object to store usage data

const dbName = 'usageDataDB';
const storeName = 'usageStore';
let db = null;

// Open the IndexedDB database
function openDatabase() {
  console.log('Opening IndexedDB...');
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = (event) => {
    console.log('IndexedDB upgrade needed...');
    db = event.target.result;
    const store = db.createObjectStore(storeName, { keyPath: 'hostname' });
    store.createIndex('hostname', 'hostname', { unique: true });
    console.log('Object store created in IndexedDB');
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    console.log('Database opened successfully');
  };

  request.onerror = (event) => {
    console.error('Database error:', event.target.error);
  };
}

openDatabase();

// Save usage data to IndexedDB
async function saveUsageData() {
  console.log('Attempting to save usage data to IndexedDB...');
  if (!db) {
    console.error('Database not open yet, cannot save usage data.');
    return;
  }

  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  for (const [hostname, time] of Object.entries(usageData)) {
    console.log(`Saving data for hostname: ${hostname}, time: ${time}`);
    const record = { hostname, time };
    await new Promise((resolve, reject) => {
      const request = store.put(record); // Use put() to insert or update the data
      request.onsuccess = resolve;
      request.onerror = (event) => reject(event.target.error);
    });
  }

  transaction.oncomplete = () => {
    console.log('Usage data saved to IndexedDB:', usageData);
  };

  transaction.onerror = (event) => {
    console.error('Error saving data to IndexedDB:', event.target.error);
  };
}

// Fetch limits from chrome.storage.local
function getLimits() {
  console.log('Fetching limits from chrome.storage.local...');
  return new Promise((resolve) => {
    chrome.storage.local.get(["limits"], (data) => {
      console.log('Limits fetched:', data.limits || {});
      resolve(data.limits || {});
    });
  });
}

// Check if a URL is supported (e.g., exclude chrome:// or internal URLs)
function isSupportedUrl(url) {
  try {
    const protocol = new URL(url).protocol;
    console.log(`Checking URL support for: ${url}`);
    return protocol === "http:" || protocol === "https:";
  } catch (error) {
    console.error('Error checking URL support:', error);
    return false;
  }
}

// Notify the user when a tab is closed due to exceeding the time limit
function notifyUser(hostname) {
  console.log(`Notifying user about time limit reached for: ${hostname}`);
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: "Time Limit Reached",
    message: `Your time limit for ${hostname} has been reached, and the tab has been closed.`,
  });
}

// Check if a tab exceeds its limit and close it if necessary
async function checkAndCloseTab(hostname, tabId) {
  console.log(`Checking time limits for hostname: ${hostname}, Tab ID: ${tabId}`);
  const limits = await getLimits();
  if (limits[hostname]) {
    const limit = limits[hostname];
    const usedTime = usageData[hostname] || 0;

    console.log(`[checkAndCloseTab] Hostname: ${hostname}, Used: ${usedTime} mins, Limit: ${limit} mins`);

    if (usedTime >= limit) {
      console.log(`Time limit exceeded for ${hostname}. Closing tab ID: ${tabId}`);
      chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
          console.error(`[checkAndCloseTab] Error closing tab: ${chrome.runtime.lastError.message}`);
        } else {
          console.log(`[checkAndCloseTab] Tab with ID ${tabId} closed due to exceeded limit.`);
          notifyUser(hostname);
        }
      });
    }
  } else {
    console.log(`[checkAndCloseTab] No limit set for hostname: ${hostname}`);
  }
}

// Record time spent on a tab
async function recordTabTime(tabId) {
  console.log(`Recording time for Tab ID: ${tabId}`);
  if (!tabId || !activeTabStartTime) {
    console.log('No active tab or start time; skipping time recording.');
    return;
  }

  const elapsedTime = Math.round((Date.now() - activeTabStartTime) / 1000 / 60); // Convert to minutes
  console.log(`Elapsed time for Tab ID ${tabId}: ${elapsedTime} minutes`);

  if (elapsedTime > 0) {
    try {
      const tab = await new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab || !tab.url) {
            reject('Error getting tab information');
          } else {
            resolve(tab);
          }
        });
      });

      if (!isSupportedUrl(tab.url)) {
        console.log(`[recordTabTime] Unsupported URL: ${tab.url}`);
        return;
      }

      const url = new URL(tab.url);
      const hostname = url.hostname;

      console.log(`[recordTabTime] Updating usage data for hostname: ${hostname}`);
      if (!usageData[hostname]) usageData[hostname] = 0;
      usageData[hostname] += elapsedTime;

      await saveUsageData();

      await checkAndCloseTab(hostname, tabId);
    } catch (error) {
      console.error('Error processing tab time:', error);
    }
  }
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo);
  if (activeTabId !== null) {
    console.log(`Switching away from Tab ID: ${activeTabId}`);
    recordTabTime(activeTabId);
  }

  activeTabId = activeInfo.tabId;
  activeTabStartTime = Date.now();
  console.log(`New active Tab ID: ${activeTabId}`);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`Tab updated: Tab ID: ${tabId}, Change Info:`, changeInfo);
  if (tabId === activeTabId && changeInfo.status === "complete") {
    recordTabTime(tabId);
    activeTabStartTime = Date.now();
    console.log(`Tab ID ${tabId} navigation completed; start time reset.`);
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`Tab removed: Tab ID ${tabId}`);
  if (tabId === activeTabId) {
    recordTabTime(tabId);
    activeTabId = null;
    activeTabStartTime = null;
    console.log('Active tab cleared after removal.');
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log(`Window focus changed: Window ID ${windowId}`);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log('No window in focus.');
    recordTabTime(activeTabId);
    activeTabId = null;
    activeTabStartTime = null;
  } else {
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        activeTabStartTime = Date.now();
        console.log(`Window focus switched to Tab ID: ${activeTabId}`);
      }
    });
  }
});
