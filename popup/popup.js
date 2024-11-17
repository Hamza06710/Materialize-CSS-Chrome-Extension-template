const statusTagRunning = document.querySelector(".tag.is-success");
const statusTagStopped = document.querySelector(".tag.is-danger");
const usageSelect = document.querySelector("select"); // The first <select> element
const limitsSelect = document.querySelectorAll("select")[1]; // The second <select> element
const addLimitButton = document.querySelector(".button.is-success");

// Function to update the status
function updateStatus(isRunning) {
  if (isRunning) {
    statusTagRunning.style.display = "inline-block";
    statusTagStopped.style.display = "none";
  } else {
    statusTagRunning.style.display = "none";
    statusTagStopped.style.display = "inline-block";
  }
}

// Fetch and display usage stats
function loadUsage() {
  chrome.storage.local.get(["usage"], (data) => {
    if (data.usage) {
      // Clear and populate the usage dropdown
      usageSelect.innerHTML = "";
      Object.keys(data.usage).forEach((website) => {
        const option = document.createElement("option");
        option.textContent = `${website} - ${data.usage[website]} minutes`;
        option.value = website;
        usageSelect.appendChild(option);
      });
    } else {
      const placeholder = document.createElement("option");
      placeholder.textContent = "No data available";
      placeholder.disabled = true;
      usageSelect.appendChild(placeholder);
    }
  });
}

// Fetch and display limits
function loadLimits() {
  chrome.storage.local.get(["limits"], (data) => {
    if (data.limits) {
      // Clear and populate the limits dropdown
      limitsSelect.innerHTML = "";
      Object.entries(data.limits).forEach(([website, limit]) => {
        const option = document.createElement("option");
        option.textContent = `${website} - ${limit} minutes`;
        option.value = website;
        limitsSelect.appendChild(option);
      });
    } else {
      const placeholder = document.createElement("option");
      placeholder.textContent = "No limits set";
      placeholder.disabled = true;
      limitsSelect.appendChild(placeholder);
    }
  });
}

// Add a new limit
addLimitButton.addEventListener("click", () => {
  const website = prompt("Enter the website URL:");
  const limit = prompt("Enter the time limit in minutes:");

  if (website && limit) {
    chrome.storage.local.get(["limits"], (data) => {
      const limits = data.limits || {};
      limits[website] = parseInt(limit, 10);
      chrome.storage.local.set({ limits }, () => {
        alert("Limit added!");
        loadLimits(); // Refresh the limits dropdown
      });
    });
  }
});

// Initialize the popup
document.addEventListener("DOMContentLoaded", () => {
  // Check if tracking is running
  chrome.storage.local.get(["isRunning"], (data) => {
    updateStatus(data.isRunning || false);
  });

  // Load data
  loadUsage();
  loadLimits();
});