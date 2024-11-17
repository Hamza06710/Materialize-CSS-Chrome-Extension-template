let activeTabId = null; // ID of the currently active tab
let activeTabStartTime = null; // Start time of the active tab
const usageData = {}; // Object to store usage data

const dbName = 'usageDataDB';
const storeName = 'usageStore';
let db = null;

setInterval(() => {
  chrome.runtime.sendMessage({msg: "focused_tab", data: {usageData}})
}, 10000);

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
  if (!db) {
    console.error('Database not open yet, cannot save usage data.');
    return;
  }
  
  console.log('Attempting to save usage data...');
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  for (const [hostname, time] of Object.entries(usageData)) {
    const record = { hostname, time };
    await new Promise((resolve, reject) => {
      const request = store.put(record); // Use put() to insert or update the data
      request.onsuccess = resolve;
      request.onerror = (event) => reject(event.target.error);
    });
    console.log(`Saved data for ${hostname}: ${time} minutes`);
  }

  transaction.oncomplete = () => {

    console.log('Usage data saved to IndexedDB:', usageData);
  };

  transaction.onerror = (event) => {
    console.error('Error saving data to IndexedDB:', event.target.error);
  };
}

// Record time spent on a tab
async function recordTabTime(tabId) {
  // Add debugging info to verify activeTabId and activeTabStartTime
  console.log('recordTabTime called');
  console.log(`activeTabId: ${activeTabId}, activeTabStartTime: ${activeTabStartTime}`);

  if (!tabId || !activeTabStartTime) {
    console.log('No valid tab ID or start time, skipping record...');
    return; // Early exit if there's no active tab or start time
  }

  console.log("Now time:" + Date.now())

  const elapsedTime = Math.round((Date.now() - activeTabStartTime)); // Convert to minutes
  console.log("time: " + elapsedTime)
  if (elapsedTime > 0) {
    console.log(`Tab ID: ${tabId}, Elapsed Time: ${elapsedTime} minutes`);
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

      // Extract the hostname from the URL
      const url = new URL(tab.url);
      const hostname = url.hostname;
      console.log(`Tab URL: ${tab.url}, Hostname: ${hostname}`);

      // Update the usage data
      if (!usageData[hostname]) {
        usageData[hostname] = 0;
      }
      usageData[hostname] += elapsedTime;

      await saveUsageData(); // Save the updated usage data to IndexedDB
    } catch (error) {
      console.error('Error processing tab time:', error);
    }
  }

  // Only reset the state after all operations are completed
  activeTabStartTime = null; // Reset start time
  activeTabId = null; // Reset active tab ID
  console.log('State reset: activeTabId and activeTabStartTime cleared');
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`Tab activated: ${activeInfo.tabId}`);
  
  if (activeTabId !== null) {
    recordTabTime(activeTabId); // Record time spent on the previous tab
  }

  activeTabId = activeInfo.tabId; // Update the active tab
  activeTabStartTime = Date.now(); // Start time for new tab
  console.log(`Active tab set to: ${activeTabId}, Start Time: ${activeTabStartTime}`);
});

// Listen for tab updates (e.g., navigating to a new URL in the same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.status === "complete") {
    console.log(`Tab updated: ${tabId}, Status: ${changeInfo.status}`);
    recordTabTime(tabId); // Record time before navigating to new URL
    activeTabStartTime = Date.now(); // Reset start time for the new URL
    console.log(`New tab started: ${tabId}, Start Time: ${activeTabStartTime}`);
  }
});

// Listen for when a tab is removed (closed)
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    console.log(`Tab closed: ${tabId}`);
    recordTabTime(tabId); // Record time before the tab is closed
    activeTabId = null; // Reset active tab
    activeTabStartTime = null; // Reset start time
  }
});

//listen for when a tab is queried
// chrome.tabs.query({}, function (tabs) {
//   tabs.forEach((tab) => {
//     chrome.tabs.sendMessage( 
//       tab.id,
//       youtPayload, 
//       function (response) {
//        // do something here if you want
       
//       }
//     );
//   });
// });

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  console.log(`Window focus changed: ${windowId}`);
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser unfocused (e.g., minimized or user switched to another application)
    recordTabTime(activeTabId);
    activeTabId = null;
    activeTabStartTime = null;
  } else {
    // Browser focused
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        activeTabStartTime = Date.now();
        console.log(`Browser focused, active tab set to: ${activeTabId}, Start Time: ${activeTabStartTime}`);

      }
    });
  }
});
