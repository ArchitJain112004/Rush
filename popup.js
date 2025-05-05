document.addEventListener("DOMContentLoaded", () => {
  const autofillBtn = document.getElementById("autofill");
  const updateBtn = document.getElementById("update");
  const clearBtn = document.getElementById("clear");

  autofillBtn?.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const tabId = tab.id;

      // Don't try to inject script into extension pages
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) {
        alert("Autofill can't run on Chrome or Extension pages.");
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          files: ["content.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Script injection failed:", chrome.runtime.lastError.message);
            alert("Autofill failed: " + chrome.runtime.lastError.message);
          } else {
            chrome.tabs.sendMessage(tabId, { action: "autofill" }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Autofill failed:", chrome.runtime.lastError.message);
                alert("Autofill failed: " + chrome.runtime.lastError.message);
              } else {
                console.log("Autofill triggered successfully", response);
              }
            });
          }
        }
      );
    });
  });

  updateBtn?.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  clearBtn?.addEventListener("click", () => {
    chrome.storage.local.clear(() => {
      alert("All information cleared!");
    });
  });
});
