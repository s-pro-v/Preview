// --- 1. ZAPAMIĘTYWANIE MOTYWU (Ładowanie) ---
let initialMonacoTheme = 'myCustomLight'; // Domyślny
(function () {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('theme', 'dark');
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        initialMonacoTheme = 'myCustomDark';
    }
})();

// --- URL SANITIZER (Naprawa linków) ---
// Funkcja dodana z Twojego nowego kodu
function sanitizeUrl(url) {
    try {
        if (!url) return '';
        const u = new URL(url);

        // 1. Konwersja GitHub Blob -> Raw
        if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
            u.hostname = 'raw.githubusercontent.com';
            u.pathname = u.pathname.replace('/blob/', '/');
        }

        // 2. Obsługa Gist (Naprawa błędu CORS)
        if (u.hostname === 'gist.github.com') {
            u.hostname = 'gist.githubusercontent.com';
        }

        return u.toString();
    } catch (e) {
        return url;
    }
}

// Zmienne dla elementów DOM
const urlInput = document.getElementById('urlInput');
const fetchButton = document.getElementById('fetchButton');
const buttonText = document.getElementById('buttonText');
const loader = document.getElementById('loader');
const updatePreviewButton = document.getElementById('updatePreviewButton');
const stopPreviewButton = document.getElementById('stopPreviewButton');
const previewFrame = document.getElementById('previewFrame');
const themeToggle = document.getElementById('themeToggle');
const toggleEditorButton = document.getElementById('toggleEditorButton');
const statusBar = document.getElementById('statusBar');
const languageSelector = document.getElementById('languageSelector');
const toggleUrlListButton = document.getElementById('toggleUrlListButton');
const closeUrlListButton = document.getElementById('closeUrlListButton');
const urlListPanel = document.getElementById('urlListPanel');
const addCurrentUrlButton = document.getElementById('addCurrentUrlButton');
const loadUrlListButton = document.getElementById('loadUrlListButton');
const urlListItems = document.getElementById('urlListItems');

// Elementy modalu
const addUrlModal = document.getElementById('addUrlModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalUrlInput = document.getElementById('modalUrlInput');
const modalNameInput = document.getElementById('modalNameInput');
const modalAddButton = document.getElementById('modalAddButton');
const modalListUrlInput = document.getElementById('modalListUrlInput');
const modalLoadListButton = document.getElementById('modalLoadListButton');

// Konfiguracja GitHub Fetching (Z nowego kodu)
const GITHUB_USER = 'skokivPr';
const GITHUB_REPO = 'json-lista';
const GITHUB_FILE = 'html.json';
const URL_MAIN = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE}`;
const URL_MASTER = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/master/${GITHUB_FILE}`;

// Lista URL - domyślna i załadowana z localStorage
let savedUrls = JSON.parse(localStorage.getItem('savedUrls') || '[]');


// URL listy do załadowania
const URL_LIST_SOURCE = 'https://gist.githubusercontent.com/skokivPr/b351264e9a24e4bffbe086c538f5b744/raw/80294412cbeea0923fbc04a728db9da6603b2a0a/lista';
function extractNameFromUrl(url) {
    const shortName = url.substring(url.lastIndexOf('/') + 1) || url;
    return shortName;
}

// Aktualizacja starych nazw
savedUrls = savedUrls.map(item => {
    if (/^URL \d+$/.test(item.name)) {
        return { ...item, name: extractNameFromUrl(item.url) };
    }
    return item;
});
localStorage.setItem('savedUrls', JSON.stringify(savedUrls));

// Resizer variables
const resizer = document.getElementById('resizer');
const editorPanel = document.getElementById('editorPanel');
const previewPanel = document.getElementById('previewPanel');
const content = document.getElementById('content');
const rulerIndicator = document.getElementById('rulerIndicator');
const bottomRuler = document.getElementById('bottomRuler');
const rulerMarks = document.getElementById('rulerMarks');
const rulerIndicatorBottom = document.getElementById('rulerIndicatorBottom');

// Punkty magnetyczne
const snapPoints = [25, 33.33, 50, 66.67, 75];
const snapThreshold = 2;

function generateRulerMarks() {
    rulerMarks.innerHTML = '';
    for (let i = 0; i <= 100; i += 10) {
        const mark = document.createElement('div');
        mark.className = 'ruler-mark major';
        mark.style.left = `${i}%`;
        const label = document.createElement('div');
        label.className = 'ruler-label';
        label.textContent = `${i}%`;
        mark.appendChild(label);
        rulerMarks.appendChild(mark);
    }
    for (let i = 5; i < 100; i += 10) {
        const mark = document.createElement('div');
        mark.className = 'ruler-mark minor';
        mark.style.left = `${i}%`;
        rulerMarks.appendChild(mark);
    }
    snapPoints.forEach(point => {
        if (point % 10 !== 0 && Math.abs(point - Math.round(point)) > 0.1) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark major';
            mark.style.left = `${point}%`;
            const label = document.createElement('div');
            label.className = 'ruler-label';
            label.textContent = `${point.toFixed(1)}%`;
            mark.appendChild(label);
            rulerMarks.appendChild(mark);
        }
    });
}
generateRulerMarks();

// Zmienna globalna dla Instancji Edytora
let monacoEditor;
let lightColors, darkColors;

// Logika Edytora Monaco
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
require(['vs/editor/editor.main'], function () {

    function defineThemes() {
        const styles = getComputedStyle(document.documentElement);
        const isCurrentlyDark = document.documentElement.hasAttribute('theme');

        document.documentElement.removeAttribute('theme');
        lightColors = {
            bg: styles.getPropertyValue('--panel-bg').trim(),
            text: styles.getPropertyValue('--text-color').trim(),
            highlight: styles.getPropertyValue('--highlight-color').trim(),
            border: styles.getPropertyValue('--border-color').trim(),
            muted: styles.getPropertyValue('--text-muted').trim()
        };

        document.documentElement.setAttribute('theme', 'dark');
        darkColors = {
            bg: styles.getPropertyValue('--panel-bg').trim(),
            text: styles.getPropertyValue('--text-color').trim(),
            highlight: styles.getPropertyValue('--highlight-color').trim(),
            border: styles.getPropertyValue('--border-color').trim(),
            muted: styles.getPropertyValue('--text-muted').trim()
        };

        if (isCurrentlyDark) {
            document.documentElement.setAttribute('theme', 'dark');
        } else {
            document.documentElement.removeAttribute('theme');
        }

        monaco.editor.defineTheme('myCustomLight', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000' },
                { token: 'string', foreground: 'a31515' },
                { token: 'keyword', foreground: '0000ff' },
                { token: 'number', foreground: '098658' },
                { token: 'tag', foreground: '800000' },
                { token: 'attribute.name', foreground: 'ff0000' },
                { token: 'attribute.value', foreground: '0000ff' },
                { token: 'type', foreground: '267f99' },
                { token: 'delimiter', foreground: '000000' },
            ],
            colors: {
                'editor.background': lightColors.bg,
                'editor.foreground': lightColors.text,
                'editorCursor.foreground': lightColors.highlight,
                'editor.lineHighlightBackground': lightColors.bg.replace('ff', 'ee'),
                'editor.selectionBackground': `${lightColors.highlight}40`,
                'editor.selectionHighlightBackground': `${lightColors.highlight}20`,
                'editorLineNumber.foreground': lightColors.muted,
                'editorLineNumber.activeForeground': lightColors.highlight
            }
        });

        monaco.editor.defineTheme('myCustomDark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'tag', foreground: '569CD6' },
                { token: 'attribute.name', foreground: '9CDCFE' },
                { token: 'attribute.value', foreground: 'CE9178' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'delimiter', foreground: 'D4D4D4' },
            ],
            colors: {
                'editor.background': darkColors.bg,
                'editor.foreground': darkColors.text,
                'editorCursor.foreground': darkColors.highlight,
                'editor.lineHighlightBackground': '#ffffff08',
                'editor.selectionBackground': `${darkColors.highlight}40`,
                'editor.selectionHighlightBackground': `${darkColors.highlight}20`,
                'editorLineNumber.foreground': darkColors.muted,
                'editorLineNumber.activeForeground': darkColors.highlight
            }
        });

        if (monacoEditor) {
            monaco.editor.setTheme(isCurrentlyDark ? 'myCustomDark' : 'myCustomLight');
        }
    }

    const savedContent = localStorage.getItem('editorContent');
    const defaultContent = '<!-- Witaj! Wpisz URL powyżej, aby pobrać kod -->';

    monacoEditor = monaco.editor.create(document.getElementById('monacoEditorContainer'), {
        value: savedContent !== null ? savedContent : defaultContent,
        language: 'html',
        theme: initialMonacoTheme,
        automaticLayout: true,
        wordWrap: 'on',
    });

    let saveTimeout;
    monacoEditor.onDidChangeModelContent(() => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem('editorContent', monacoEditor.getValue());
        }, 500);
    });

    languageSelector.value = 'html';

    // --- Logika Aplikacji ---

    const fetchAndLoadContent = async () => {
        // Zastosowanie sanitizera
        const rawUrl = urlInput.value;
        const url = sanitizeUrl(rawUrl);

        // Aktualizacja inputu jeśli sanitizer coś zmienił
        if (rawUrl !== url) {
            urlInput.value = url;
        }

        if (!url) {
            showError("Proszę podać adres URL.");
            return;
        }

        updateStatus(`Pobieranie z ${url}...`);
        loader.style.display = 'block';
        buttonText.style.display = 'none';
        fetchButton.querySelector('i').style.display = 'none';
        fetchButton.disabled = true;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Błąd HTTP! Status: ${response.status}`);
            }
            const textContent = await response.text();

            monacoEditor.setValue(textContent);
            localStorage.setItem('editorContent', textContent);

            let language = 'plaintext';
            try {
                const path = new URL(url).pathname;
                if (path.endsWith('.js')) language = 'javascript';
                else if (path.endsWith('.css')) language = 'css';
                else if (path.endsWith('.json')) language = 'json';
                else if (path.endsWith('.html') || path.endsWith('.htm')) language = 'html';
                else if (path.endsWith('.md')) language = 'markdown';
                else if (path.endsWith('.py')) language = 'python';
                else if (path.endsWith('.xml') || path.endsWith('.svg')) language = 'xml';
                else if (path.endsWith('.sql')) language = 'sql';
            } catch (e) { }

            monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
            languageSelector.value = language;
            updateStatus(`Pobrano pomyślnie. Język: ${language}.`);

        } catch (error) {
            showError(`Błąd podczas pobierania: ${error.message}`);
            if (error.message.includes('404')) {
                showError('Błąd: Nie znaleziono pliku (404). Sprawdź adres URL.');
            }
        } finally {
            loader.style.display = 'none';
            buttonText.style.display = 'block';
            fetchButton.querySelector('i').style.display = 'inline-block';
            fetchButton.disabled = false;
        }
    };

    const updateStatus = (message) => {
        statusBar.textContent = message;
        statusBar.style.color = 'var(--text-muted)';
    };
    const showError = (message) => {
        statusBar.textContent = message;
        statusBar.style.color = 'var(--highlight-color)';
    };

    // --- Event Listeners ---

    fetchButton.addEventListener('click', fetchAndLoadContent);

    updatePreviewButton.addEventListener('click', () => {
        const code = monacoEditor.getValue();
        previewFrame.srcdoc = code;
        updateStatus("Zaktualizowano podgląd.");
    });

    if (stopPreviewButton) {
        stopPreviewButton.addEventListener('click', () => {
            previewFrame.srcdoc = '';
            updateStatus("Podgląd zatrzymany.");
        });
    }

    languageSelector.addEventListener('change', (e) => {
        const lang = e.target.value;
        monaco.editor.setModelLanguage(monacoEditor.getModel(), lang);
        updateStatus(`Język zmieniony na: ${lang}.`);
    });

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
        defineThemes();
    });

    toggleEditorButton.addEventListener('click', () => {
        const isHidden = editorPanel.classList.toggle('hidden');
        resizer.classList.toggle('hidden');
        previewPanel.classList.toggle('full-width');

        if (isHidden) {
            toggleEditorButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleEditorButton.title = "Pokaż edytor";
        } else {
            toggleEditorButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
            toggleEditorButton.title = "Ukryj edytor";
        }
        if (!isHidden) {
            monacoEditor.layout();
        }
    });

    // --- Resizer Logic ---
    let isDragging = false;
    function findSnapPoint(percent) {
        for (let snapPoint of snapPoints) {
            if (Math.abs(percent - snapPoint) < snapThreshold) {
                return snapPoint;
            }
        }
        return percent;
    }

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        resizer.classList.add('is-dragging');
        document.body.style.cursor = 'col-resize';
        previewFrame.style.pointerEvents = 'none';
        rulerIndicator.classList.add('active');
        bottomRuler.classList.add('active');
        e.preventDefault();
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            resizer.classList.remove('is-dragging');
            document.body.style.cursor = 'default';
            previewFrame.style.pointerEvents = 'auto';
            rulerIndicator.classList.remove('active');
            bottomRuler.classList.remove('active');
            monacoEditor.layout();
            updateStatus('Gotowy.');
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newEditorWidth = e.clientX - content.getBoundingClientRect().left;
        const containerWidth = content.clientWidth;
        let newEditorWidthPercent = (newEditorWidth / containerWidth) * 100;
        const snappedPercent = findSnapPoint(newEditorWidthPercent);
        const isSnapped = snappedPercent !== newEditorWidthPercent;
        if (isSnapped) newEditorWidthPercent = snappedPercent;

        if (newEditorWidthPercent > 15 && newEditorWidthPercent < 85) {
            editorPanel.style.width = `${newEditorWidthPercent}%`;
            const actualWidth = (newEditorWidthPercent / 100) * containerWidth;
            rulerIndicator.style.left = `${content.getBoundingClientRect().left + actualWidth}px`;
            rulerIndicator.setAttribute('data-width', `${newEditorWidthPercent.toFixed(1)}% ${isSnapped ? '📍' : ''}`);
            rulerIndicatorBottom.style.left = `${newEditorWidthPercent}%`;
            rulerIndicatorBottom.setAttribute('data-percentage', `${newEditorWidthPercent.toFixed(1)}% ${isSnapped ? '📍' : ''}`);
            updateStatus(`Szerokość edytora: ${newEditorWidthPercent.toFixed(1)}% (${Math.round(actualWidth)}px)${isSnapped ? ' 📍 SNAP' : ''}`);
        }
    });

    defineThemes();

    // --- 7. Modal do zarządzania URL ---

    function openModal(tab = 'single') {
        addUrlModal.classList.add('active');
        if (tab === 'single') {
            modalUrlInput.value = urlInput.value;
            modalNameInput.value = '';
        } else if (tab === 'list') {
            modalListUrlInput.value = ''; // Wyczyszczone, bo używamy GitHub buttona
        }
        switchModalTab(tab);
    }

    function closeModal() {
        addUrlModal.classList.remove('active');
        modalUrlInput.value = '';
        modalNameInput.value = '';
    }

    function switchModalTab(tabName) {
        document.querySelectorAll('.modal-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.modal-tab-content').forEach(content => content.classList.remove('active'));
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        const content = document.getElementById(tabName === 'single' ? 'tabSingle' : 'tabList');
        if (tab) tab.classList.add('active');
        if (content) content.classList.add('active');
    }

    closeModalButton.addEventListener('click', closeModal);
    addUrlModal.addEventListener('click', (e) => { if (e.target === addUrlModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && addUrlModal.classList.contains('active')) closeModal(); });
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => switchModalTab(tab.dataset.tab));
    });

    const addUrlFromModal = () => {
        const url = sanitizeUrl(modalUrlInput.value.trim()); // Używamy sanitizera
        if (!url) { showError('Proszę podać URL.'); return; }
        if (savedUrls.some(item => item.url === url)) { showError('Ten URL już istnieje na liście.'); return; }
        const name = modalNameInput.value.trim() || extractNameFromUrl(url);
        savedUrls.push({ name, url });
        localStorage.setItem('savedUrls', JSON.stringify(savedUrls));
        renderUrlList();
        updateStatus(`Dodano: ${name}`);
        closeModal();
    };

    modalAddButton.addEventListener('click', addUrlFromModal);
    modalUrlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addUrlFromModal(); });
    modalNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addUrlFromModal(); });

    // --- 8. Panel z listą URL & Integracja GitHub ---

    function renderUrlList() {
        // Dodaj przycisk ładowania z GitHub jeśli nie istnieje
        let githubBtnContainer = document.getElementById('github-btn-container');
        if (!githubBtnContainer) {
            githubBtnContainer = document.createElement('div');
            githubBtnContainer.id = 'github-btn-container';
            githubBtnContainer.style.padding = '10px';
            githubBtnContainer.style.borderBottom = '1px solid var(--border-color)';

            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.width = '100%';
            btn.style.fontSize = '0.9rem';
            btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Pobierz bazę przykładów (GitHub)';
            btn.onclick = loadGithubProjects;

            githubBtnContainer.appendChild(btn);
            // Wstaw przycisk na początku panelu, przed listą
            urlListItems.parentElement.insertBefore(githubBtnContainer, urlListItems);
        }

        if (savedUrls.length === 0) {
            urlListItems.innerHTML = '<div class="url-list-empty">Brak zapisanych adresów URL.<br>Dodaj URL lub pobierz bazę z GitHub.</div>';
            return;
        }

        urlListItems.innerHTML = savedUrls.map((item, index) => `
            <div class="url-item-wrapper">
                <button class="url-item" data-index="${index}" title="${item.url}">
                    <span class="url-item-name">${item.name || 'Bez nazwy'}</span>
                </button>
                <button class="url-item-delete" data-index="${index}" title="Usuń">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        document.querySelectorAll('.url-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt(item.dataset.index);
                urlInput.value = savedUrls[index].url;
                urlListPanel.classList.remove('active');
                fetchAndLoadContent();
            });
        });

        document.querySelectorAll('.url-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                const name = savedUrls[index].name || 'Bez nazwy';
                if (confirm(`Czy na pewno usunąć "${name}"?`)) {
                    savedUrls.splice(index, 1);
                    localStorage.setItem('savedUrls', JSON.stringify(savedUrls));
                    renderUrlList();
                    updateStatus(`Usunięto: ${name}`);
                }
            });
        });
    }

    // --- ZINTEGROWANA FUNKCJA FETCHOWANIA Z GITHUB ---
    function loadGithubProjects() {
        updateStatus(`Łączenie z repozytorium ${GITHUB_USER}/${GITHUB_REPO}...`);

        // Zmieniamy ikonę na spinner
        const btn = document.querySelector('#github-btn-container button');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pobieranie...';
            btn.disabled = true;

            fetch(URL_MAIN)
                .then(res => {
                    if (res.ok) return res.json();
                    console.warn(`Błąd main (${res.status}). Próba master...`);
                    return fetch(URL_MASTER).then(resMaster => {
                        if (!resMaster.ok) throw new Error(`Błąd pobierania (Status: ${resMaster.status})`);
                        return resMaster.json();
                    });
                })
                .then(data => {
                    let addedCount = 0;
                    // Zakładamy, że data to tablica obiektów {name, url} lub podobna
                    if (Array.isArray(data)) {
                        data.forEach(project => {
                            // Normalizacja danych
                            const url = sanitizeUrl(project.url);
                            const name = project.name || extractNameFromUrl(url);

                            // Sprawdź duplikaty
                            const exists = savedUrls.some(existing =>
                                existing.url.replace(/\/$/, '') === url.replace(/\/$/, '')
                            );

                            if (!exists && url) {
                                savedUrls.push({ name, url });
                                addedCount++;
                            }
                        });
                    }

                    if (addedCount > 0) {
                        localStorage.setItem('savedUrls', JSON.stringify(savedUrls));
                        renderUrlList();
                        updateStatus(`Pobrano pomyślnie! Dodano ${addedCount} nowych projektów.`);
                    } else {
                        updateStatus(`Pobrano, ale wszystkie projekty są już na liście.`);
                    }
                })
                .catch(error => {
                    console.error("Błąd GitHub:", error);
                    showError(`Nie udało się pobrać listy: ${error.message}`);
                })
                .finally(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                });
        }
    }

    toggleUrlListButton.addEventListener('click', () => {
        urlListPanel.classList.toggle('active');
        if (urlListPanel.classList.contains('active')) {
            renderUrlList();
        }
    });

    closeUrlListButton.addEventListener('click', () => {
        urlListPanel.classList.remove('active');
    });

    addCurrentUrlButton.addEventListener('click', () => openModal('single'));
    loadUrlListButton.addEventListener('click', () => openModal('list'));

    // Renderuj listę przy starcie i załaduj projekty jeśli lista pusta
    renderUrlList();

    // Opcjonalnie: Automatyczne ładowanie przy pustej liście (odkomentuj jeśli chcesz)
    // if (savedUrls.length === 0) { loadGithubProjects(); }



});

