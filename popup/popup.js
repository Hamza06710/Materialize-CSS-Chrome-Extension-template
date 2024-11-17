// Get references to HTML elements
const usageField = document.querySelector(".field label.label:nth-of-type(1)");
const limitsSelect = document.querySelector(".select select"); // The <select> element for limits
const addLimitButton = document.getElementById("add-limit-button");
const limitModal = document.getElementById("limit-modal");
const saveLimitButton = document.getElementById("save-limit");
const cancelModalButtons = document.querySelectorAll(".cancel-modal, .delete");
const modalBackground = document.querySelector(".modal-background");

// Debugging helper
function log(...args) {
  console.log("[Popup.js]", ...args);
}

// Modal controls
function openModal() {
  log("Opening modal...");
  limitModal.classList.add("is-active");
}

function closeModal() {
  log("Closing modal...");
  limitModal.classList.remove("is-active");
}

// Fetch and display usage stats
function loadUsage() {
  chrome.storage.local.get(["usage"], (data) => {
    if (data.usage) {
      usageField.textContent = "Usage: "; // Reset label text
      const usageList = document.createElement("ul");
      usageList.style.marginLeft = "1em";
      Object.entries(data.usage).forEach(([website, time]) => {
        const listItem = document.createElement("li");
        listItem.textContent = `${website}: ${time} minutes`;
        usageList.appendChild(listItem);
      });
      usageField.appendChild(usageList);
    } else {
      usageField.textContent = "Usage: No data available";
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

// Save a new limit to chrome.storage
saveLimitButton.addEventListener("click", () => {
  const websiteUrl = document.getElementById("website-url").value.trim();
  const timeLimit = parseInt(document.getElementById("time-limit").value.trim(), 10);

  log("Save limit clicked with URL:", websiteUrl, "and time limit:", timeLimit);

  if (!websiteUrl || isNaN(timeLimit) || timeLimit <= 0) {
    alert("Please enter a valid URL and time limit.");
    return;
  }

  // Simplify the URL to its hostname
  let domain;
  try {
    domain = new URL(websiteUrl).hostname;
  } catch (error) {
    alert("Invalid URL format. Please enter a valid URL.");
    return;
  }

  // Save to storage
  chrome.storage.local.get(["limits"], (data) => {
    const limits = data.limits || {};
    limits[domain] = timeLimit;

    chrome.storage.local.set({ limits }, () => {
      log(`Limit set for ${domain}: ${timeLimit} minutes`);
      alert(`Limit set: ${domain} - ${timeLimit} minutes`);
      closeModal(); // Close the modal
      loadLimits(); // Refresh the limits dropdown
    });
  });
});

// Event listeners for modal controls
addLimitButton.addEventListener("click", () => {
  log("Add Limit button clicked.");
  openModal();
});

cancelModalButtons.forEach((button) =>
  button.addEventListener("click", () => {
    log("Cancel/close button clicked.");
    closeModal();
  })
);

modalBackground.addEventListener("click", () => {
  log("Modal background clicked.");
  closeModal();
});

// Initialize the popup
document.addEventListener("DOMContentLoaded", () => {
  log("Popup loaded.");
  loadUsage();
  loadLimits();
});
