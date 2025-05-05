
document.addEventListener("DOMContentLoaded", () => {
  // Load stored data into form fields
  chrome.storage.local.get(null, (data) => {
    Object.keys(data).forEach((key) => {
      const input = document.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = data[key];
      }
    });
  });

  // Save form data to chrome.storage.local
  document.getElementById("updateForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const dataToStore = {};

    formData.forEach((value, key) => {
      dataToStore[key] = value;
    });

    chrome.storage.local.set(dataToStore, () => {
      alert("Your information has been saved!");
    });
  });
});
