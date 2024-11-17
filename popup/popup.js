const dbName = 'usageDataDB';
const storeName = 'usageStore';
let db = null;
const usageField = document.getElementById("usage-list"); // The container where the usage data will be displayed
const limitsSelect = document.getElementById("limits-select"); // The dropdown for limits
document.addEventListener("DOMContentLoaded", () => {
  const addLimitButton = document.getElementById("add-limit-button");
  const limitModal = document.getElementById("limit-modal");
  const modalBackground = document.getElementById("modal-background");
  const cancelModalButton = document.getElementById("cancel-modal");
  const modalCloseButton = document.getElementById("modal-close");
  const saveLimitButton = document.getElementById("save-limit");

  // Function to open the modal
  function openModal() {
    limitModal.classList.add("is-active");
  }

  // Function to close the modal
  function closeModal() {
    limitModal.classList.remove("is-active");
  }
  function loadLimits() {
    console.log("[loadLimits] Attempting to load limits...");
  
    const limitsSelect = document.getElementById("limits-select");
    if (!limitsSelect) {
      console.error("[loadLimits] Error: Limits dropdown element not found.");
      return;
    }
  
    // Clear previous options
    limitsSelect.innerHTML = "";
  
    // Retrieve limits from chrome.storage.local
    chrome.storage.local.get(["limits"], (data) => {
      if (chrome.runtime.lastError) {
        console.error("[loadLimits] Error accessing chrome.storage:", chrome.runtime.lastError);
        return;
      }
  
      const limits = data.limits || {};
      console.log("[loadLimits] Retrieved limits:", limits);
  
      if (Object.keys(limits).length === 0) {
        // If no limits, show a placeholder
        const placeholder = document.createElement("option");
        placeholder.textContent = "No limits set";
        placeholder.disabled = true;
        placeholder.selected = true;
        limitsSelect.appendChild(placeholder);
      } else {
        // Populate dropdown with limits
        Object.entries(limits).forEach(([website, limit]) => {
          const option = document.createElement("option");
          option.textContent = `${website} - ${limit} minutes`;
          limitsSelect.appendChild(option);
        });
      }
    });
  }
  
  // Function to save the limit
  function saveLimit() {
    const websiteUrl = document.getElementById("website-url").value.trim();
    const timeLimit = parseInt(document.getElementById("time-limit").value.trim(), 10);

    if (!websiteUrl || isNaN(timeLimit) || timeLimit <= 0) {
      alert("Please enter a valid URL and time limit.");
      return;
    }

    let domain;
    try {
      domain = new URL(websiteUrl).hostname; // Simplify URL to hostname
    } catch (error) {
      alert("Invalid URL format. Please enter a valid URL.");
      return;
    }

    // Save the limit in chrome.storage.local
    chrome.storage.local.get(["limits"], (data) => {
      const limits = data.limits || {};
      limits[domain] = timeLimit;

      chrome.storage.local.set({ limits }, () => {
        alert(`Limit set: ${domain} - ${timeLimit} minutes`);
        closeModal(); // Close modal after saving
        loadLimits(); // Refresh limits dropdown
      });
    });
  }

  // Attach event listeners
  addLimitButton.addEventListener("click", openModal);
  modalBackground.addEventListener("click", closeModal);
  cancelModalButton.addEventListener("click", closeModal);
  modalCloseButton.addEventListener("click", closeModal);
  saveLimitButton.addEventListener("click", saveLimit);

  // Load existing limits (defined elsewhere)
  loadLimits();
});
// Open the IndexedDB database
function openDatabase() {
  console.log("[openDatabase] Initializing IndexedDB...");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      console.log("[openDatabase] Upgrade needed, setting up database schema...");
      db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'hostname' });
        console.log("[openDatabase] Object store created:", storeName);
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("[openDatabase] IndexedDB opened successfully:", db);
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("[openDatabase] Error opening IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Fetch usage data from IndexedDB
function fetchUsageData() {
  console.log("[fetchUsageData] Starting fetch from IndexedDB...");
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error("[fetchUsageData] Database is not initialized!");
      reject("Database not initialized");
      return;
    }

    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = (event) => {
      console.log("[fetchUsageData] Data fetched successfully:", event.target.result);
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("[fetchUsageData] Error fetching data:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Format and display usage data
function formatUsageData(usageData) {
  console.log("[formatUsageData] Formatting and displaying usage data...");
  usageField.innerHTML = ''; // Clear previous data
  const usageList = document.createElement("ul");
  // usageList.style.marginLeft = "1em";
  let totalTime = 0;

  Object.entries(usageData).forEach(([website, time]) => {
    if (time !== undefined && time !== null) {
      console.log(`[formatUsageData] Adding to UI - Website: ${website}, Time: ${time} minutes`);
      const listItem = document.createElement("li");
      listItem.textContent = `${website}: ${time} minutes`;
      usageList.appendChild(listItem);
      totalTime += time;
    }
  });

  const totalTimeElement = document.createElement("p");
  totalTimeElement.style.marginLeft = "3em";
  totalTimeElement.textContent = `Total Time: ${totalTime} minutes`;
  usageField.appendChild(totalTimeElement);
  usageField.appendChild(usageList);
  console.log("[formatUsageData] Usage data displayed successfully.");
}

// Update UI with the latest usage data
async function updateUsageUI() {
  console.log("[updateUsageUI] Starting UI update...");
  usageField.innerHTML = ''; // Clear previous usage data
  try {
    const usageData = await fetchUsageData();
    if (usageData.length > 0) {
      console.log("[updateUsageUI] Usage data retrieved:", usageData);
      const formattedData = usageData.reduce((acc, record) => {
        acc[record.hostname] = record.time;
        return acc;
      }, {});
      formatUsageData(formattedData); // Display the usage data
    } else {
      console.log("[updateUsageUI] No usage data found.");
      usageField.textContent = "Usage: No data available";
    }
  } catch (error) {
    console.error("[updateUsageUI] Error updating UI:", error);
    usageField.textContent = "Usage: Error loading data";
  }
}

// Auto-load data when popup is opened
document.addEventListener("DOMContentLoaded", () => {
  console.log("[DOMContentLoaded] Popup loaded. Initializing...");
  openDatabase()
    .then(() => {
      console.log("[DOMContentLoaded] Database initialized successfully.");
      return updateUsageUI(); // Fetch and display usage data
    })
    .catch((error) => {
      console.error("[DOMContentLoaded] Error initializing database:", error);
      usageField.textContent = "Error initializing database";
    });
});

// Listen for messages from the background script to refresh usage data
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log("[onMessage] Message received:", request);
//   if (request.msg === "update_usage") {
//     console.log("[onMessage] Received 'update_usage' message. Refreshing data...");
//     updateUsageUI()
//       .then(() => {
//         console.log("[onMessage] UI updated successfully.");
//         sendResponse({ status: "Usage updated in popup" });
//       })
//       .catch((error) => {
//         console.error("[onMessage] Error updating UI:", error);
//         sendResponse({ status: "Error updating usage" });
//       });
//   }
// });
