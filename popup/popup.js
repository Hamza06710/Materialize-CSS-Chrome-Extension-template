// // Initialize IndexedDB and handle data fetching
// const dbName = 'usageDataDB';
// const storeName = 'usageStore';
// let db = null;

// // Open the IndexedDB database
// function openDatabase() {
//   console.log("[openDatabase] Initializing IndexedDB...");
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open(dbName, 1);

//     request.onupgradeneeded = (event) => {
//       db = event.target.result;
//       console.log("[openDatabase] Creating object store...");
//       db.createObjectStore(storeName, { keyPath: 'hostname' });
//     };

//     request.onsuccess = (event) => {
//       db = event.target.result;
//       console.log("[openDatabase] IndexedDB opened successfully.");
//       resolve(db);
//     };

//     request.onerror = (event) => {
//       console.error("[openDatabase] Error opening IndexedDB:", event.target.error);
//       reject(event.target.error);
//     };
//   });
// }

// // Fetch usage data from IndexedDB
// function fetchUsageData() {
//   console.log("[fetchUsageData] Fetching data from IndexedDB...");
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction([storeName], 'readonly');
//     const store = transaction.objectStore(storeName);
//     const request = store.getAll();

//     request.onsuccess = (event) => {
//       console.log("[fetchUsageData] Data fetched successfully:", event.target.result);
//       resolve(event.target.result);
//     };

//     request.onerror = (event) => {
//       console.error("[fetchUsageData] Error fetching data:", event.target.error);
//       reject(event.target.error);
//     };
//   });
// }

// // Format and display usage data
// function formatUsageData(usageData) {
//   console.log("[formatUsageData] Formatting usage data:", usageData);
//   const usageList = document.createElement("ul");
//   usageList.style.marginLeft = "1em";
//   let totalTime = 0;

//   Object.entries(usageData).forEach(([website, time]) => {
//     console.log(`[formatUsageData] Website: ${website}, Time: ${time} minutes`);
//     const listItem = document.createElement("li");
//     listItem.textContent = `${website}: ${time} minutes`;
//     usageList.appendChild(listItem);
//     totalTime += time;
//   });

//   const totalTimeElement = document.createElement("p");
//   totalTimeElement.textContent = `Total Time: ${totalTime} minutes`;
//   usageField.appendChild(totalTimeElement);
//   usageField.appendChild(usageList);
// }

// // Fetch and display usage stats
// async function loadUsage() {
//   console.log("[loadUsage] Loading usage data...");
//   usageField.innerHTML = ''; // Clear previous usage data
//   try {
//     const usageData = await fetchUsageData();
//     if (usageData.length > 0) {
//       console.log("[loadUsage] Usage data found:", usageData);
//       const formattedData = usageData.reduce((acc, record) => {
//         acc[record.hostname] = record.time;
//         return acc;
//       }, {});
//       formatUsageData(formattedData);
//     } else {
//       console.log("[loadUsage] No usage data found.");
//       usageField.textContent = "Usage: No data available";
//     }
//   } catch (error) {
//     console.error("[loadUsage] Error fetching usage data:", error);
//     usageField.textContent = "Usage: Error loading data";
//   }
// }

// // Load limits from chrome.storage.local
// function loadLimits() {
//   console.log("[loadLimits] Loading limits...");
//   chrome.storage.local.get(["limits"], (data) => {
//     if (data.limits) {
//       console.log("[loadLimits] Limits found:", data.limits);
//       limitsSelect.innerHTML = "";
//       Object.entries(data.limits).forEach(([website, limit]) => {
//         console.log(`[loadLimits] Website: ${website}, Limit: ${limit} minutes`);
//         const option = document.createElement("option");
//         option.textContent = `${website} - ${limit} minutes`;
//         limitsSelect.appendChild(option);
//       });
//     } else {
//       console.log("[loadLimits] No limits found.");
//       const placeholder = document.createElement("option");
//       placeholder.textContent = "No limits set";
//       placeholder.disabled = true;
//       limitsSelect.appendChild(placeholder);
//     }
//   });
// }

// // Modal controls
// function openModal() {
//   console.log("[openModal] Opening modal...");
//   limitModal.classList.add("is-active");
// }

// function closeModal() {
//   console.log("[closeModal] Closing modal...");
//   limitModal.classList.remove("is-active");
// }

// // Event listeners for modal controls
// addLimitButton.addEventListener("click", () => {
//   console.log("[addLimitButton] Add Limit button clicked.");
//   openModal();
// });

// cancelModalButtons.forEach((button) =>
//   button.addEventListener("click", () => {
//     console.log("[cancelModalButtons] Cancel/close button clicked.");
//     closeModal();
//   })
// );

// modalBackground.addEventListener("click", () => {
//   console.log("[modalBackground] Modal background clicked.");
//   closeModal();
// });

// // Auto-load data when popup is opened
// document.addEventListener("DOMContentLoaded", () => {
//   console.log("[DOMContentLoaded] Popup loaded.");
  
//   // Ensure IndexedDB is open before loading usage and limits
//   openDatabase().then(() => {
//     console.log("[DOMContentLoaded] Database opened.");
//     loadUsage();
//     loadLimits();
//   }).catch(error => {
//     console.error("[DOMContentLoaded] Error initializing popup:", error);
//   });
// });

// // Listen for changes in storage and update usage
// chrome.storage.onChanged.addListener((changes, areaName) => {
//   console.log("[onChanged] Storage changed. Area:", areaName, "Changes:", changes);
//   if (areaName === "local" && changes.usage) {
//     loadUsage();
//   }
// });

console.log("aaa")