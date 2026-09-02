// --- CONFIG ---
const GITHUB_CFG = {
  USER: "s-pro-v",
  REPO: "json-lista",
  FILE: "html.json",
};

// --- THEME ENGINE ---
const themeEngine = {
  init: () => {
    const saved = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("theme", saved);
  },
  toggle: () => {
    const current = document.documentElement.getAttribute("theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("theme", next);
    localStorage.setItem("theme", next);

    if (window.monacoEditor && typeof monaco !== "undefined") {
      const theme = next === "dark" ? "terminal-dark" : "terminal-light";
      try {
        monaco.editor.setTheme(theme);
      } catch (e) {
        // Fallback do standardowych motywów Monaco
        monaco.editor.setTheme(next === "dark" ? "vs-dark" : "vs");
      }
    }
  },
};

// --- UTILS ---
const sanitizeUrl = (url) => {
  try {
    if (!url) return "";
    const u = new URL(url);
    if (u.hostname === "github.com" && u.pathname.includes("/blob/")) {
      u.hostname = "raw.githubusercontent.com";
      u.pathname = u.pathname.replace("/blob/", "/");
    }
    if (u.hostname === "gist.github.com") {
      u.hostname = "gist.githubusercontent.com";
    }
    return u.toString();
  } catch (e) {
    return url;
  }
};

const updateStatus = (msg) => {
  const el = document.getElementById("statusBar");
  if (el) el.innerText = `[LOG]: ${msg.toUpperCase()}`;
};

// --- EDITOR LOGIC ---
// Aktualizacja do nowszej wersji Monaco (np. 0.52.0)
require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.0/min/vs",
  },
});

require(["vs/editor/editor.main"], function () {
  // Delikatne opóźnienie, aby upewnić się, że ewentualne style/motywy zewnętrzne (monaco-styles.js) się wczytały
  setTimeout(() => {
    const savedContent =
      localStorage.getItem("editorContent") ||
      "<!-- INITIALIZING SYSTEM... -->";
    let theme =
      document.documentElement.getAttribute("theme") === "light"
        ? "terminal-light"
        : "terminal-dark";

    try {
      if (typeof monaco !== "undefined" && monaco.editor) {
        monaco.editor.setTheme(theme);
      }
    } catch (e) {
      theme =
        document.documentElement.getAttribute("theme") === "light"
          ? "vs"
          : "vs-dark";
    }

    window.monacoEditor = monaco.editor.create(
      document.getElementById("monacoEditorContainer"),
      {
        value: savedContent || "// TERMINAL_READY\n// START_CODING...",
        language: "html",
        theme: theme,
        fontSize: 13,
        fontFamily:
          "'JetBrains Mono', 'Share Tech Mono', 'Consolas', 'Monaco', 'Courier New', monospace",
        automaticLayout: true,
        minimap: { enabled: true, scale: 0.75 },
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        cursorBlinking: "block",
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indent: true },
        renderLineHighlight: "line",
        smoothScrolling: true,
        mouseWheelZoom: true,
        wordWrap: "on",
        fontLigatures: true,
        formatOnPaste: true,
        formatOnType: true,
      },
    );

    window.monacoEditor.onDidChangeModelContent(() => {
      localStorage.setItem("editorContent", window.monacoEditor.getValue());
    });

    setupEventListeners();
    loadSavedUrls();
  }, 50); // Skrócono timeout
});

// --- APP LOGIC ---
let savedUrls = JSON.parse(localStorage.getItem("savedUrls") || "[]");

function setupEventListeners() {
  // --- FETCH ENGINE ---
  document.getElementById("fetchButton").addEventListener("click", async () => {
    const url = sanitizeUrl(document.getElementById("urlInput").value);
    if (!url) return updateStatus("ERROR: MISSING TARGET URL");

    updateStatus("INITIATING CONNECTION...");
    const loader = document.getElementById("loader");
    const icon = document.querySelector(".fa-download");

    if (loader) loader.style.display = "block";
    if (icon) icon.style.display = "none";

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      window.monacoEditor.setValue(text);
      updateStatus("COMPILE COMPLETE");

      // Auto-detect language (rozszerzony)
      const model = window.monacoEditor.getModel();
      const lowerUrl = url.toLowerCase();

      if (lowerUrl.endsWith(".js"))
        monaco.editor.setModelLanguage(model, "javascript");
      else if (lowerUrl.endsWith(".ts"))
        monaco.editor.setModelLanguage(model, "typescript");
      else if (lowerUrl.endsWith(".css"))
        monaco.editor.setModelLanguage(model, "css");
      else if (lowerUrl.endsWith(".json"))
        monaco.editor.setModelLanguage(model, "json");
      else if (lowerUrl.endsWith(".html") || lowerUrl.endsWith(".htm"))
        monaco.editor.setModelLanguage(model, "html");
    } catch (e) {
      updateStatus(`CRITICAL ERROR: ${e.message}`);
    } finally {
      if (loader) loader.style.display = "none";
      if (icon) icon.style.display = "inline-block";
    }
  });

  // --- PREVIEW ENGINE ---
  document
    .getElementById("updatePreviewButton")
    .addEventListener("click", () => {
      let code = window.monacoEditor.getValue();
      const hideScrollbarStyle = `
            <style>
                html, body, * {
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                }
                html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
            </style>`;

      if (code.includes("</head>")) {
        code = code.replace("</head>", hideScrollbarStyle + "</head>");
      } else {
        code = hideScrollbarStyle + code;
      }
      document.getElementById("previewFrame").srcdoc = code;
      updateStatus("PREVIEW RENDERED");
    });

  document.getElementById("stopPreviewButton").addEventListener("click", () => {
    document.getElementById("previewFrame").srcdoc = "";
    updateStatus("PREVIEW STOPPED");
  });

  // --- UI TOGGLES ---
  document
    .getElementById("themeToggle")
    .addEventListener("click", themeEngine.toggle);

  const editorPanel = document.getElementById("editorPanel");
  const previewPanel = document.getElementById("previewPanel");
  const resizer = document.getElementById("resizer");

  document
    .getElementById("toggleEditorButton")
    .addEventListener("click", () => {
      editorPanel.classList.toggle("hidden");
      resizer.classList.toggle("hidden");
      if (editorPanel.classList.contains("hidden")) {
        previewPanel.style.width = "100%";
      } else {
        previewPanel.style.width = ""; // Reset to flex
      }
    });

  document
    .getElementById("languageSelector")
    .addEventListener("change", (e) => {
      monaco.editor.setModelLanguage(
        window.monacoEditor.getModel(),
        e.target.value,
      );
    });

  // --- DATABASE PANEL ---
  const urlListPanel = document.getElementById("urlListPanel");
  const toggleUrlListButton = document.getElementById("toggleUrlListButton");

  toggleUrlListButton.addEventListener("click", (e) => {
    e.stopPropagation();
    urlListPanel.classList.add("active");
  });

  document
    .getElementById("closeUrlListButton")
    .addEventListener("click", () => {
      urlListPanel.classList.remove("active");
    });

  document.addEventListener("click", (e) => {
    if (urlListPanel.classList.contains("active")) {
      if (
        !urlListPanel.contains(e.target) &&
        e.target !== toggleUrlListButton
      ) {
        urlListPanel.classList.remove("active");
      }
    }
  });

  urlListPanel.addEventListener("click", (e) => e.stopPropagation());

  // --- CONFIRM MODAL LOGIC ---
  const confirmModal = document.getElementById("confirmModal");
  let pendingAction = null;

  const openConfirm = (callback) => {
    pendingAction = callback;
    confirmModal.classList.add("active");
  };

  const closeConfirm = () => {
    pendingAction = null;
    confirmModal.classList.remove("active");
  };

  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirm();
  });

  document
    .getElementById("executeConfirmButton")
    .addEventListener("click", () => {
      if (pendingAction) pendingAction();
      closeConfirm();
    });

  document
    .getElementById("cancelConfirmButton")
    .addEventListener("click", closeConfirm);
  document
    .getElementById("closeConfirmModalButton")
    .addEventListener("click", closeConfirm);

  // --- CLEAR ALL DATABASE ---
  document.getElementById("clearAllButton").addEventListener("click", () => {
    if (savedUrls.length === 0) return updateStatus("DATABASE EMPTY");
    openConfirm(() => {
      savedUrls = [];
      saveUrls();
      renderList();
      updateStatus("REGISTRY PURGED. SYSTEM READY.");
    });
  });

  // --- RESIZER LOGIC ---
  let isDragging = false;
  let startX = 0;
  let startWidth = 0;
  const MAGNETIC_THRESHOLD = 20;
  const MAGNETIC_POSITIONS = { "-1": 0.25, 0: 0.5, 1: 0.75 };

  const magneticGuide = document.createElement("div");
  magneticGuide.className = "magnetic-guide";
  const magneticLabel = document.createElement("div");
  magneticLabel.className = "magnetic-label";
  magneticGuide.appendChild(magneticLabel);
  document.body.appendChild(magneticGuide);

  function getMagneticPosition(x, containerRect) {
    const containerWidth = containerRect.width;
    const relativeX = x - containerRect.left;
    const relativePercent = relativeX / containerWidth;

    let closestPos = null;
    let closestDist = Infinity;
    let closestLabel = "";

    for (const [label, percent] of Object.entries(MAGNETIC_POSITIONS)) {
      const targetX = containerRect.left + containerWidth * percent;
      const dist = Math.abs(x - targetX);
      if (dist < MAGNETIC_THRESHOLD && dist < closestDist) {
        closestDist = dist;
        closestPos = targetX;
        closestLabel = label;
      }
    }
    return { position: closestPos, label: closestLabel };
  }

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    startX = e.clientX;
    startWidth = editorPanel.offsetWidth;
    resizer.classList.add("dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const iframe = document.querySelector("iframe");
    if (iframe) iframe.style.pointerEvents = "none";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove("dragging");
      magneticGuide.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      const iframe = document.querySelector("iframe");
      if (iframe) iframe.style.pointerEvents = "auto";
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    document.body.style.cursor = "col-resize";

    const container = document.querySelector(".content");
    const containerRect = container.getBoundingClientRect();
    let newWidth = startWidth + (e.clientX - startX);
    const minWidth = containerRect.width * 0.15;
    const maxWidth = containerRect.width * 0.85;

    const magnetic = getMagneticPosition(e.clientX, containerRect);

    if (magnetic.position !== null) {
      newWidth = magnetic.position - containerRect.left;
      magneticGuide.style.left = `${magnetic.position}px`;
      magneticLabel.textContent = magnetic.label;
      magneticGuide.classList.add("active");
    } else {
      magneticGuide.classList.remove("active");
    }

    if (newWidth >= minWidth && newWidth <= maxWidth) {
      editorPanel.style.width = `${newWidth}px`;
      editorPanel.style.flexGrow = "0";
      editorPanel.style.flexShrink = "0";
    }
  });

  // --- ADD URL MODAL ---
  const modal = document.getElementById("addUrlModal");
  document
    .getElementById("addCurrentUrlButton")
    .addEventListener("click", () => {
      modal.classList.add("active");
      switchTab("single");
      document.getElementById("modalUrlInput").value =
        document.getElementById("urlInput").value;
    });

  document
    .getElementById("closeModalButton")
    .addEventListener("click", () => modal.classList.remove("active"));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  document.getElementById("modalAddButton").addEventListener("click", () => {
    const url = document.getElementById("modalUrlInput").value;
    const name =
      document.getElementById("modalNameInput").value ||
      url.split("/").pop() ||
      "Unnamed";
    if (url) {
      savedUrls.push({ name, url });
      saveUrls();
      renderList();
      modal.classList.remove("active");
      updateStatus(`RECORD ADDED: ${name}`);
    }
  });

  document.querySelectorAll(".modal-tab").forEach((t) => {
    t.addEventListener("click", () => switchTab(t.dataset.tab));
  });

  document
    .getElementById("loadGithubButton")
    .addEventListener("click", loadGithub);
}

function switchTab(tab) {
  document
    .querySelectorAll(".modal-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".modal-tab-content")
    .forEach((c) => c.classList.add("hidden"));
  document
    .querySelector(`.modal-tab[data-tab="${tab}"]`)
    .classList.add("active");
  document
    .getElementById(tab === "single" ? "tabSingle" : "tabList")
    .classList.remove("hidden");
}

function saveUrls() {
  localStorage.setItem("savedUrls", JSON.stringify(savedUrls));
}

function renderList() {
  const container = document.getElementById("urlListItems");
  const counter = document.getElementById("dbCounter");
  if (counter)
    counter.innerText = `[${savedUrls.length.toString().padStart(2, "0")}]`;

  if (savedUrls.length === 0) {
    container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 11px; font-style: italic;">REGISTRY EMPTY // AWAITING DATA</div>`;
    return;
  }

  container.innerHTML = savedUrls
    .map(
      (item, idx) => `
        <div class="url-item" onclick="loadUrl(${idx})">
            <div style="display:flex; align-items:center; overflow:hidden;">
                <span class="url-index">[${idx.toString().padStart(2, "0")}]</span>
                <span class="url-item-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.url}">${item.name}</span>
            </div>
            <i class="fas fa-trash" style="color:var(--danger-color); cursor:pointer; padding:4px;" onclick="event.stopPropagation(); deleteUrl(${idx})"></i>
        </div>
    `,
    )
    .join("");
}

window.loadUrl = (idx) => {
  const item = savedUrls[idx];
  document.getElementById("urlInput").value = item.url;
  document.getElementById("fetchButton").click();
  document.getElementById("urlListPanel").classList.remove("active");
};

// Zastąpiono systemowy window.confirm Twoim modalem (jeśli element confirmModal istnieje w HTML)
window.deleteUrl = (idx) => {
  const confirmModal = document.getElementById("confirmModal");

  if (confirmModal) {
    // Używamy zdefiniowanego systemu openConfirm
    // UWAGA: openConfirm jest wyizolowane w setupEventListeners,
    // więc używamy obejścia wywołując logikę bezpośrednio na tablicy.
    const item = savedUrls[idx];
    const doDelete = () => {
      savedUrls.splice(idx, 1);
      saveUrls();
      renderList();
      updateStatus(`DELETED: ${item.name}`);
    };

    // Prowizoryczne podpięcie globalne dla funkcji openConfirm
    if (window.__openConfirmGlobal) {
      window.__openConfirmGlobal(doDelete);
    } else {
      // Fallback na natywny, gdyby funkcja nie była zbindowana
      if (confirm(`CONFIRM DELETION: ${item.name}?`)) doDelete();
    }
  } else {
    if (confirm("CONFIRM DELETION?")) {
      savedUrls.splice(idx, 1);
      saveUrls();
      renderList();
      updateStatus("RECORD DELETED");
    }
  }
};

function loadSavedUrls() {
  renderList();
}

// Zrefaktoryzowane na nowoczesne async/await
async function loadGithub() {
  const url = `https://raw.githubusercontent.com/${GITHUB_CFG.USER}/${GITHUB_CFG.REPO}/main/${GITHUB_CFG.FILE}`;
  updateStatus("CONNECTING TO GITHUB MAIN NODE...");

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const data = await response.json();
    let count = 0;

    if (Array.isArray(data)) {
      data.forEach((p) => {
        if (!savedUrls.some((u) => u.url === p.url)) {
          savedUrls.push({
            name: p.name || p.url.split("/").pop(),
            url: p.url,
          });
          count++;
        }
      });
      saveUrls();
      renderList();
      updateStatus(`SYNC COMPLETE. ${count} NEW OBJECTS.`);
    } else {
      updateStatus("SYNC ERROR: INVALID JSON FORMAT");
    }
  } catch (e) {
    updateStatus(`SYNC ERROR: REPOSITORY UNREACHABLE (${e.message})`);
  }
}

// Globalny binding dla otwierania modalu z wewnątrz funkcji window.deleteUrl
document.addEventListener("DOMContentLoaded", () => {
  const confirmModal = document.getElementById("confirmModal");
  let pendingGlobalAction = null;

  window.__openConfirmGlobal = (callback) => {
    pendingGlobalAction = callback;
    confirmModal.classList.add("active");
  };

  document
    .getElementById("executeConfirmButton")
    ?.addEventListener("click", () => {
      if (pendingGlobalAction) {
        pendingGlobalAction();
        pendingGlobalAction = null;
      }
    });
});

// Init
themeEngine.init();
