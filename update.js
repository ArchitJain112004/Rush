chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofill") {
    chrome.storage.local.get(null, (data) => {
      console.log("📦 Data from storage:", data);
      console.log("🌐 Current page URL:", window.location.href);

      if (!data || Object.keys(data).length === 0) {
        console.warn("⚠️ No autofill data found in local storage.");
        sendResponse({ status: "no_data" });
        return;
      }

      waitForFormAndAutofill(document, data);

      const iframes = document.querySelectorAll("iframe");
      for (const iframe of iframes) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc && iframeDoc.location.origin === window.location.origin) {
            waitForFormAndAutofill(iframeDoc, data);
          } else {
            throw new Error("Cross-origin");
          }
        } catch (e) {
          console.warn("❌ Cross-origin iframe skipped:", e.message);
        }
      }

      sendResponse({ status: "done" });
    });

    return true;
  }
});

function waitForFormAndAutofill(root, data) {
  const maxRetries = 10;
  let attempts = 0;

  const tryAutofill = () => {
    const elements = getAllElementsIncludingShadow(root);
    console.log("🔍 Elements found:", elements.length);

    if (elements.length >= 3) {
      autofillAllFields(root, data);
      return true;
    }

    return false;
  };

  if (tryAutofill()) return;

  const observer = new MutationObserver(() => {
    attempts++;
    if (tryAutofill() || attempts >= maxRetries) {
      observer.disconnect();
    }
  });

  observer.observe(root.body || root, { childList: true, subtree: true });
}

function autofillAllFields(root, data) {
  const elements = getAllElementsIncludingShadow(root);

  elements.forEach((field) => {
    const identifier = getFieldIdentifier(field).toLowerCase();
    console.log("🧠 Checking field:", identifier);

    for (const key in data) {
      const value = data[key];
      const normalizedKey = normalizeKey(key);

      if (
        identifier.includes(normalizedKey) ||
        normalizedKey.includes(identifier) ||
        fuzzyMatch(identifier, normalizedKey)
      ) {
        try {
          const tag = field.tagName.toLowerCase();
          const type = field.type?.toLowerCase();

          if (type === "radio") {
            const name = field.name;
            const group = root.querySelectorAll(`input[type="radio"][name="${name}"]`);
            for (const radio of group) {
              if (
                normalizeKey(radio.value) === normalizeKey(value) ||
                normalizeKey(radio.id) === normalizeKey(value) ||
                normalizeKey(radio.labels?.[0]?.innerText || "") === normalizeKey(value)
              ) {
                radio.checked = true;
                radio.dispatchEvent(new Event("change", { bubbles: true }));
                console.log(`✅ Selected radio [${name}] = ${value}`);
                break;
              }
            }
          } else if (tag === "select") {
            for (const option of field.options) {
              if (normalizeKey(option.text) === normalizeKey(value)) {
                field.value = option.value;
                field.dispatchEvent(new Event("change", { bubbles: true }));
                console.log(`✅ Selected option for [${identifier}]: ${value}`);
                break;
              }
            }
          } else {
            field.focus();
            field.value = value;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`✅ Autofilled [${identifier}] with: ${value}`);
          }
        } catch (err) {
          console.warn("⚠️ Error filling field:", identifier, err.message);
        }

        break;
      }
    }
  });
}

function getAllElementsIncludingShadow(root) {
  const results = [];

  function walk(node) {
    if (node.nodeType !== 1) return;

    if (
      node.matches("input, textarea, select") &&
      node.type !== "hidden" &&
      !node.disabled &&
      node.offsetParent !== null
    ) {
      results.push(node);
    }

    if (node.shadowRoot) Array.from(node.shadowRoot.children).forEach(walk);
    Array.from(node.children).forEach(walk);
  }

  walk(root.body || root);
  return results;
}

function getFieldIdentifier(field) {
  let identifier =
    field.name ||
    field.id ||
    field.placeholder ||
    field.getAttribute("aria-label") ||
    "";

  if (!identifier && field.labels?.length) {
    identifier = field.labels[0].innerText;
  }

  if (!identifier) {
    const label = field.closest("label")?.innerText;
    if (label) identifier = label;
  }

  if (!identifier) {
    const parent = field.closest("div");
    if (parent) {
      const texts = Array.from(parent.querySelectorAll("*"))
        .map(el => el.textContent?.trim())
        .filter(Boolean);
      identifier = texts.join(" ").split("\n")[0] || "";
    }
  }

  return identifier.trim();
}

function normalizeKey(str) {
  return str.toLowerCase().replace(/[^a-z]/g, "");
}

function fuzzyMatch(a, b) {
  return (
    a.includes(b) ||
    b.includes(a) ||
    levenshteinDistance(a, b) <= 2
  );
}

function levenshteinDistance(a, b) {
  const matrix = Array(a.length + 1).fill(null).map(() =>
    Array(b.length + 1).fill(null)
  );

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}
