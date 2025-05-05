# 🚀 Rush

**Rush** is a smart Chrome extension that automatically fills out job application forms using AI-powered field matching.

## 🔍 Features

- Autofills fields on job portal forms with your stored personal data
- AI-based fuzzy matching of field names (even if the field labels vary)
- Supports forms with shadow DOM and embedded iframes (when possible)
- One-click activation via extension popup

## 🛠️ Installation

1. Clone this repo or [Download the ZIP](https://github.com/ArchitJain112004/Rush)
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked** and select the `Rush` folder
5. Click the extension icon and press **Autofill**

## 🧠 How It Works

The extension:
- Uses your saved profile data from `chrome.storage.local`
- Matches field names and labels using fuzzy matching (Levenshtein distance)
- Dispatches events (`input`, `change`) to ensure compatibility with React-based forms

## 📝 License

MIT License. Feel free to fork, use, or contribute — just give credit!

---

Made with 💻 by Archit Jain
