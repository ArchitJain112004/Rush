chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofill") {
    chrome.storage.local.get(null, (data) => {
      autofillAllFields(document, data);

      const iframes = document.querySelectorAll("iframe");
      for (const iframe of iframes) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          if (iframeDoc) autofillAllFields(iframeDoc, data);
        } catch (e) {
          const src = iframe.src || "unknown source";
          console.debug(`🔒 Skipped cross-origin iframe: ${src}`);
        }
      }

      sendResponse({ status: "done" });
    });
    return true;
  }
});

function autofillAllFields(root, data) {
  const elements = getAllElementsIncludingShadow(root);

  elements.forEach((field) => {
    const identifier = getFieldIdentifier(field).toLowerCase();

    for (const key in data) {
      const value = data[key];
      const normalizedKey = normalizeKey(key);

      if (
        identifier.includes(normalizedKey) ||
        normalizedKey.includes(identifier) ||
        fuzzyMatch(identifier, normalizedKey)
      ) {
        field.focus();
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        console.log(`✅ Autofilled [${identifier}] with: ${value}`);
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

    const shadow = node.shadowRoot;
    if (shadow) Array.from(shadow.children).forEach(walk);
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

  // Fallback: scrape inner text from container
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
