 // --- CONFIG ---
        const GITHUB_CFG = {
            USER: 'skokivPr',
            REPO: 'json-lista',
            FILE: 'html.json'
        };

        // --- THEME ENGINE ---
        const themeEngine = {
            init: () => {
                const saved = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('theme', saved);
            },
            toggle: () => {
                const current = document.documentElement.getAttribute('theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('theme', next);
                localStorage.setItem('theme', next);
                if (window.monacoEditor && window.monaco) {
                    // Użyj motywów z monaco-styles.js jeśli są dostępne
                    const theme = next === 'dark' ? 'terminal-dark' : 'terminal-light';
                    try {
                        monaco.editor.setTheme(theme);
                    } catch (e) {
                        // Fallback do standardowych motywów
                        monaco.editor.setTheme(next === 'dark' ? 'vs-dark' : 'vs');
                    }
                }
            }
        };

        // --- UTILS ---
        const sanitizeUrl = (url) => {
            try {
                if (!url) return '';
                const u = new URL(url);
                if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
                    u.hostname = 'raw.githubusercontent.com';
                    u.pathname = u.pathname.replace('/blob/', '/');
                }
                if (u.hostname === 'gist.github.com') {
                    u.hostname = 'gist.githubusercontent.com';
                }
                return u.toString();
            } catch (e) { return url; }
        };

        const updateStatus = (msg) => {
            const el = document.getElementById('statusBar');
            el.innerText = `[LOG]: ${msg.toUpperCase()}`;
        };

        // --- EDITOR LOGIC ---
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

        require(['vs/editor/editor.main'], function () {
            // Poczekaj na załadowanie motywów z monaco-styles.js
            setTimeout(() => {
                const savedContent = localStorage.getItem('editorContent') || '<!-- INITIALIZING SYSTEM... -->';

                // Użyj motywów z monaco-styles.js jeśli są dostępne
                let theme = document.documentElement.getAttribute('theme') === 'light' ? 'terminal-light' : 'terminal-dark';
                try {
                    // Sprawdź czy motyw jest zdefiniowany
                    if (typeof monaco !== 'undefined' && monaco.editor) {
                        monaco.editor.setTheme(theme);
                    }
                } catch (e) {
                    // Fallback do standardowych motywów
                    theme = document.documentElement.getAttribute('theme') === 'light' ? 'vs' : 'vs-dark';
                }

                window.monacoEditor = monaco.editor.create(document.getElementById('monacoEditorContainer'), {
                    value: savedContent || "// TERMINAL_READY\n// START_CODING...",
                    language: 'html',
                    theme: theme,
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Share Tech Mono', 'Consolas', 'Monaco', 'Courier New', monospace",
                    automaticLayout: true,
                    minimap: { enabled: true },
                    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    cursorBlinking: "block",
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indent: true },
                    renderLineHighlight: 'line',
                    smoothScrolling: true,
                    mouseWheelZoom: true,
                    wordWrap: 'on',
                    fontLigatures: true
                });

                window.monacoEditor.onDidChangeModelContent(() => {
                    localStorage.setItem('editorContent', window.monacoEditor.getValue());
                });

                // Bind Events after Monaco Load
                setupEventListeners();
                loadSavedUrls();
            }, 100);
        });

        // --- APP LOGIC ---
        let savedUrls = JSON.parse(localStorage.getItem('savedUrls') || '[]');

        function setupEventListeners() {
            // Fetch
            document.getElementById('fetchButton').addEventListener('click', async () => {
                const url = sanitizeUrl(document.getElementById('urlInput').value);
                if (!url) return updateStatus('ERROR: MISSING TARGET URL');

                updateStatus('INITIATING CONNECTION...');
                document.getElementById('loader').style.display = 'block';
                document.querySelector('.fa-download').style.display = 'none';

                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const text = await res.text();
                    window.monacoEditor.setValue(text);
                    updateStatus('TRANSFER COMPLETE');

                    // Auto-detect language
                    if (url.endsWith('.js')) monaco.editor.setModelLanguage(window.monacoEditor.getModel(), 'javascript');
                    else if (url.endsWith('.css')) monaco.editor.setModelLanguage(window.monacoEditor.getModel(), 'css');
                    else if (url.endsWith('.json')) monaco.editor.setModelLanguage(window.monacoEditor.getModel(), 'json');
                } catch (e) {
                    updateStatus(`CRITICAL ERROR: ${e.message}`);
                } finally {
                    document.getElementById('loader').style.display = 'none';
                    document.querySelector('.fa-download').style.display = 'inline-block';
                }
            });

            // Preview
            document.getElementById('updatePreviewButton').addEventListener('click', () => {
                const code = window.monacoEditor.getValue();
                document.getElementById('previewFrame').srcdoc = code;
                updateStatus('RENDER COMPLETE');
            });

            document.getElementById('stopPreviewButton').addEventListener('click', () => {
                document.getElementById('previewFrame').srcdoc = '';
                updateStatus('RENDER HALTED');
            });

            // UI Toggles
            document.getElementById('themeToggle').addEventListener('click', themeEngine.toggle);

            const editorPanel = document.getElementById('editorPanel');
            const previewPanel = document.getElementById('previewPanel');
            const resizer = document.getElementById('resizer');

            document.getElementById('toggleEditorButton').addEventListener('click', () => {
                editorPanel.classList.toggle('hidden');
                resizer.classList.toggle('hidden');
                if (editorPanel.classList.contains('hidden')) {
                    previewPanel.style.width = '100%';
                } else {
                    previewPanel.style.width = ''; // Reset to flex
                }
            });

            document.getElementById('languageSelector').addEventListener('change', (e) => {
                monaco.editor.setModelLanguage(window.monacoEditor.getModel(), e.target.value);
            });

            // Database Panel
            const urlListPanel = document.getElementById('urlListPanel');
            const toggleUrlListButton = document.getElementById('toggleUrlListButton');

            toggleUrlListButton.addEventListener('click', (e) => {
                e.stopPropagation();
                urlListPanel.classList.add('active');
            });

            document.getElementById('closeUrlListButton').addEventListener('click', () => {
                urlListPanel.classList.remove('active');
            });

            // Close panel when clicking outside
            document.addEventListener('click', (e) => {
                if (urlListPanel.classList.contains('active')) {
                    // Check if click is outside the panel
                    if (!urlListPanel.contains(e.target) && e.target !== toggleUrlListButton) {
                        urlListPanel.classList.remove('active');
                    }
                }
            });

            // Prevent panel from closing when clicking inside it
            urlListPanel.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // --- CONFIRM MODAL LOGIC ---
            const confirmModal = document.getElementById('confirmModal');
            let pendingAction = null;

            const openConfirm = (callback) => {
                pendingAction = callback;
                confirmModal.classList.add('active');
            };

            const closeConfirm = () => {
                pendingAction = null;
                confirmModal.classList.remove('active');
            };

            // Close confirm modal on overlay click
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    closeConfirm();
                }
            });

            document.getElementById('executeConfirmButton').addEventListener('click', () => {
                if (pendingAction) pendingAction();
                closeConfirm();
            });

            document.getElementById('cancelConfirmButton').addEventListener('click', closeConfirm);
            document.getElementById('closeConfirmModalButton').addEventListener('click', closeConfirm);

            // Clear All
            document.getElementById('clearAllButton').addEventListener('click', () => {
                if (savedUrls.length === 0) return updateStatus('DATABASE EMPTY');
                openConfirm(() => {
                    savedUrls = [];
                    saveUrls();
                    renderList();
                    updateStatus('REGISTRY PURGED. SYSTEM READY.');
                });
            });

            // Resizer Logic with Magnetic Snap
            let isDragging = false;
            let startX = 0;
            let startWidth = 0;
            const MAGNETIC_THRESHOLD = 20; // pixels
            const MAGNETIC_POSITIONS = {
                '-1': 0.25,  // 25%
                '0': 0.50,   // 50%
                '1': 0.75    // 75%
            };

            // Create magnetic guide line
            const magneticGuide = document.createElement('div');
            magneticGuide.className = 'magnetic-guide';
            const magneticLabel = document.createElement('div');
            magneticLabel.className = 'magnetic-label';
            magneticGuide.appendChild(magneticLabel);
            document.body.appendChild(magneticGuide);

            function getMagneticPosition(x, containerRect) {
                const containerWidth = containerRect.width;
                const relativeX = x - containerRect.left;
                const relativePercent = relativeX / containerWidth;

                let closestPos = null;
                let closestDist = Infinity;
                let closestLabel = '';

                for (const [label, percent] of Object.entries(MAGNETIC_POSITIONS)) {
                    const targetX = containerRect.left + (containerWidth * percent);
                    const dist = Math.abs(x - targetX);

                    if (dist < MAGNETIC_THRESHOLD && dist < closestDist) {
                        closestDist = dist;
                        closestPos = targetX;
                        closestLabel = label;
                    }
                }

                return { position: closestPos, label: closestLabel };
            }

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                startX = e.clientX;
                startWidth = editorPanel.offsetWidth;
                resizer.classList.add('dragging');
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                document.querySelector('iframe').style.pointerEvents = 'none';
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    resizer.classList.remove('dragging');
                    magneticGuide.classList.remove('active');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    document.querySelector('iframe').style.pointerEvents = 'auto';
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                e.preventDefault();
                // Utrzymaj kursor col-resize podczas przeciągania
                document.body.style.cursor = 'col-resize';
                const container = document.querySelector('.content');
                const containerRect = container.getBoundingClientRect();
                const deltaX = e.clientX - startX;
                let newWidth = startWidth + deltaX;
                const containerWidth = containerRect.width;
                const minWidth = containerWidth * 0.15;
                const maxWidth = containerWidth * 0.85;

                // Check for magnetic snap
                const magnetic = getMagneticPosition(e.clientX, containerRect);

                if (magnetic.position !== null) {
                    // Snap to magnetic position
                    newWidth = magnetic.position - containerRect.left;
                    magneticGuide.style.left = `${magnetic.position}px`;
                    magneticLabel.textContent = magnetic.label;
                    magneticGuide.classList.add('active');
                } else {
                    magneticGuide.classList.remove('active');
                }

                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    editorPanel.style.width = `${newWidth}px`;
                    editorPanel.style.flexGrow = '0';
                    editorPanel.style.flexShrink = '0';
                }
            });

            // Modal Logic
            const modal = document.getElementById('addUrlModal');
            document.getElementById('addCurrentUrlButton').addEventListener('click', () => {
                modal.classList.add('active');
                switchTab('single');
                document.getElementById('modalUrlInput').value = document.getElementById('urlInput').value;
            });
            document.getElementById('closeModalButton').addEventListener('click', () => modal.classList.remove('active'));

            // Close modal on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });

            document.getElementById('modalAddButton').addEventListener('click', () => {
                const url = document.getElementById('modalUrlInput').value;
                const name = document.getElementById('modalNameInput').value || url.split('/').pop();
                if (url) {
                    savedUrls.push({ name, url });
                    saveUrls();
                    renderList();
                    modal.classList.remove('active');
                    updateStatus(`RECORD ADDED: ${name}`);
                }
            });

            // Tabs
            document.querySelectorAll('.modal-tab').forEach(t => {
                t.addEventListener('click', () => switchTab(t.dataset.tab));
            });

            // GitHub Load
            document.getElementById('loadGithubButton').addEventListener('click', loadGithub);
        }

        function switchTab(tab) {
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.add('hidden'));

            document.querySelector(`.modal-tab[data-tab="${tab}"]`).classList.add('active');
            document.getElementById(tab === 'single' ? 'tabSingle' : 'tabList').classList.remove('hidden');
        }

        function saveUrls() {
            localStorage.setItem('savedUrls', JSON.stringify(savedUrls));
        }

        function renderList() {
            const container = document.getElementById('urlListItems');
            document.getElementById('dbCounter').innerText = `[${savedUrls.length.toString().padStart(2, '0')}]`;

            if (savedUrls.length === 0) {
                container.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 11px; font-style: italic;">REGISTRY EMPTY // AWAITING DATA</div>`;
                return;
            }

            container.innerHTML = savedUrls.map((item, idx) => `
                <div class="url-item" onclick="loadUrl(${idx})">
                    <div style="display:flex; align-items:center;">
                        <span class="url-index">[${idx.toString().padStart(2, '0')}]</span>
                        <span class="url-item-name">${item.name}</span>
                    </div>
                    <i class="fas fa-trash" style="color:var(--danger-color); cursor:pointer;" onclick="event.stopPropagation(); deleteUrl(${idx})"></i>
                </div>
            `).join('');
        }

        window.loadUrl = (idx) => {
            const item = savedUrls[idx];
            document.getElementById('urlInput').value = item.url;
            document.getElementById('fetchButton').click();
            document.getElementById('urlListPanel').classList.remove('active');
        };

        window.deleteUrl = (idx) => {
            if (confirm('CONFIRM DELETION')) {
                savedUrls.splice(idx, 1);
                saveUrls();
                renderList();
            }
        };

        function loadSavedUrls() {
            renderList();
        }

        function loadGithub() {
            const url = `https://raw.githubusercontent.com/${GITHUB_CFG.USER}/${GITHUB_CFG.REPO}/main/${GITHUB_CFG.FILE}`;
            updateStatus('CONNECTING TO GITHUB MAIN NODE...');
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    let count = 0;
                    if (Array.isArray(data)) {
                        data.forEach(p => {
                            if (!savedUrls.some(u => u.url === p.url)) {
                                savedUrls.push({ name: p.name || p.url.split('/').pop(), url: p.url });
                                count++;
                            }
                        });
                        saveUrls();
                        renderList();
                        updateStatus(`SYNC COMPLETE. ${count} NEW OBJECTS.`);
                    }
                })
                .catch(e => updateStatus('SYNC ERROR: REPOSITORY UNREACHABLE'));
        }

        // Init
        themeEngine.init();
