// ============================================================================
// File Name: tabscript.ts
// Purpose: Client-side JavaScript generator for in-tab navigation and search.
// ============================================================================

export interface TabScriptOptions {
    theme: string;
    safeTitle: string;
    initialBlockIndex: number;
    hasInitialDoc: boolean;
    autoSearch: boolean;
    initialQuery: string;
}

/**
 * Builds the complete client-side runtime script for the Webview documentation tab.
 */
export function buildTabScript(options: TabScriptOptions): string {
    const escapedQuery = options.initialQuery.replace(/["\\]/g, '\\$&');

    return `
        try {
            if (window.mermaid) {
                mermaid.parseError = function(err, hash) {
                    console.warn('[Mermaid parseError hook]', err);
                };
                mermaid.initialize({
                    startOnLoad: false,
                    suppressErrorRendering: true,
                    theme: '${options.theme}' === 'light' ? 'default' : 'dark',
                    securityLevel: 'loose'
                });
            }
        } catch (e) {
            console.warn('Mermaid initialization skipped:', e);
        }

        const vscode = acquireVsCodeApi();

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        let toastTimer = null;
        function showToast(msg) {
            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, 1900);
        }

        // --- MULTI-DOCUMENT STATE ---
        let openDocs = ${options.hasInitialDoc ? `[
            {
                id: 'initial',
                title: "${options.safeTitle}",
                relativePath: "${options.safeTitle}",
                html: document.getElementById('markdown-container').innerHTML,
                currentBlockIndex: ${options.initialBlockIndex},
                scrollTop: 0
            }
        ]` : `[]`};
        let activeDocIndex = openDocs.length > 0 ? 0 : -1;
        let blocks = [];
        let currentBlockIndex = 0;
        let currentTheme = '${options.theme}';

        // Track scroll position per document so scrolling doesn't leak between docs
        window.addEventListener('scroll', () => {
            if (activeDocIndex >= 0 && openDocs[activeDocIndex]) {
                openDocs[activeDocIndex].scrollTop = window.scrollY;
            }
        }, { passive: true });

        // --- SEARCH MODAL STATE ---
        let isSearchOpen = false;
        let searchResults = [];
        let selectedResultIndex = 0;
        let searchDebounceTimer = null;

        function ensureFocus() {
            try {
                window.focus();
                if (!isSearchOpen) {
                    document.body.focus();
                } else {
                    const inp = document.getElementById('search-input');
                    if (inp) inp.focus();
                }
            } catch (err) {}
        }
        window.addEventListener('load', ensureFocus);
        window.addEventListener('click', () => {
            if (!isSearchOpen) {
                document.body.focus();
            }
        });
        setTimeout(ensureFocus, 50);
        setTimeout(ensureFocus, 150);

        // --- TAB BAR RENDERING & HORIZONTAL SCROLL ---
        function scrollActiveChipIntoView() {
            const tabBar = document.getElementById('top-tab-bar');
            if (!tabBar) return;
            const activeChip = tabBar.querySelector('.tab-chip.active');
            if (!activeChip) return;
            const chipLeft = activeChip.offsetLeft;
            const chipWidth = activeChip.offsetWidth;
            const barWidth = tabBar.clientWidth;
            tabBar.scrollLeft = chipLeft - (barWidth / 2) + (chipWidth / 2);
        }

        function renderTabBar() {
            const tabBar = document.getElementById('top-tab-bar');
            if (!tabBar) return;

            if (openDocs.length === 0) {
                tabBar.style.display = 'none';
                return;
            }

            tabBar.style.display = 'flex';
            tabBar.innerHTML = openDocs.map((doc, idx) => {
                const isActive = idx === activeDocIndex;
                const label = doc.relativePath || doc.title || 'document.md';
                return '<div class="tab-chip ' + (isActive ? 'active' : '') + '" data-index="' + idx + '" title="' + escapeHtml(doc.title || doc.relativePath) + '">' +
                    '<span class="tab-title">' + escapeHtml(label) + '</span>' +
                    '<span class="tab-close" data-close-index="' + idx + '" title="Close document (x)">×</span>' +
                '</div>';
            }).join('');

            requestAnimationFrame(scrollActiveChipIntoView);
        }

        // Tab Bar Click Delegate
        const tabBarEl = document.getElementById('top-tab-bar');
        if (tabBarEl) {
            tabBarEl.addEventListener('click', (e) => {
                const closeBtn = e.target.closest('[data-close-index]');
                if (closeBtn) {
                    e.stopPropagation();
                    const idx = parseInt(closeBtn.getAttribute('data-close-index'), 10);
                    closeDoc(idx);
                    return;
                }
                const chip = e.target.closest('[data-index]');
                if (chip) {
                    const idx = parseInt(chip.getAttribute('data-index'), 10);
                    switchToDoc(idx);
                }
            });
        }

        function switchToDoc(newIdx) {
            if (openDocs.length === 0) return;
            if (newIdx < 0 || newIdx >= openDocs.length) return;

            if (activeDocIndex >= 0 && openDocs[activeDocIndex]) {
                openDocs[activeDocIndex].currentBlockIndex = currentBlockIndex;
                openDocs[activeDocIndex].scrollTop = window.scrollY;
            }

            activeDocIndex = newIdx;
            const doc = openDocs[activeDocIndex];
            const container = document.getElementById('markdown-container');
            container.innerHTML = doc.html;

            blocks = discoverBlocks();
            currentBlockIndex = Math.min(Math.max(0, doc.currentBlockIndex || 0), Math.max(0, blocks.length - 1));

            if (blocks.length > 0 && blocks[currentBlockIndex]) {
                updateActiveBlock(true);
            } else if (typeof doc.scrollTop === 'number') {
                window.scrollTo({ top: doc.scrollTop, behavior: 'auto' });
            } else {
                window.scrollTo({ top: 0, behavior: 'auto' });
            }

            renderTabBar();

            renderMermaid().then(() => {
                if (blocks.length > 0 && blocks[currentBlockIndex]) {
                    blocks[currentBlockIndex].scrollIntoView({ behavior: 'auto', block: 'center' });
                }
            });

            document.body.focus();
        }

        function closeDoc(idx) {
            if (idx < 0 || idx >= openDocs.length) return;
            const closedTitle = openDocs[idx].relativePath || openDocs[idx].title;
            openDocs.splice(idx, 1);

            if (openDocs.length === 0) {
                activeDocIndex = -1;
                blocks = [];
                const container = document.getElementById('markdown-container');
                container.innerHTML = '<div class="empty-state">' +
                    '<h3>No Open Documents</h3>' +
                    '<p>Press <kbd>s</kbd> to search and reference documents.</p>' +
                '</div>';
                document.getElementById('glance-block-badge').textContent = 'No Document';
                renderTabBar();
                showToast('Closed ' + closedTitle);
                return;
            }

            const nextIdx = Math.min(idx, openDocs.length - 1);
            activeDocIndex = -1;
            switchToDoc(nextIdx);
            showToast('Closed ' + closedTitle);
        }

        function isElementVisibleInDetails(el, container) {
            let curr = el.parentElement;
            while (curr && curr !== container) {
                if (curr.tagName === 'DETAILS') {
                    if (el.tagName === 'SUMMARY' && el.parentElement === curr) {
                        let higher = curr.parentElement;
                        while (higher && higher !== container) {
                            if (higher.tagName === 'DETAILS' && !higher.open) {
                                return false;
                            }
                            higher = higher.parentElement;
                        }
                        return true;
                    }
                    if (!curr.open) {
                        return false;
                    }
                }
                curr = curr.parentElement;
            }
            return true;
        }

        // --- BLOCK DISCOVERY ---
        function discoverBlocks() {
            const container = document.querySelector('.markdown-container');
            if (!container) return [];

            const candidates = container.querySelectorAll(
                'h1, h2, h3, h4, h5, h6, p, .code-block-target, .math-block-target, summary, details, table, blockquote, ul, ol'
            );

            return Array.from(candidates).filter(el => {
                if (el.tagName === 'DETAILS' && el.querySelector(':scope > summary')) {
                    return false;
                }

                if (!isElementVisibleInDetails(el, container)) {
                    return false;
                }

                let parent = el.parentElement;
                while (parent && parent !== container) {
                    if (parent.tagName !== 'DETAILS' && parent.matches('h1, h2, h3, h4, h5, h6, p, .code-block-target, .math-block-target, summary, table, blockquote, ul, ol')) {
                        return false;
                    }
                    parent = parent.parentElement;
                }
                return true;
            });
        }

        function getBlockType(block) {
            if (block.classList.contains('code-block-target') || 
                block.classList.contains('code-block-wrapper') || 
                block.classList.contains('mermaid') || 
                block.matches('pre.shiki')) {
                return 'code';
            }
            if (block.classList.contains('math-block-target') || 
                block.classList.contains('katex-display')) {
                return 'math';
            }
            if (block.matches('h1, h2, h3, h4, h5, h6')) return 'heading';
            if (block.matches('details, summary')) return 'details';
            if (block.matches('table')) return 'table';
            if (block.matches('ul, ol')) return 'list';
            if (block.matches('blockquote')) return 'quote';
            return 'paragraph';
        }

        function isYankable(type) {
            return type === 'code' || type === 'math';
        }

        function updateActiveBlock(instant = false) {
            if (blocks.length === 0) return;

            blocks.forEach(b => b.classList.remove('glance-active-block'));

            const block = blocks[currentBlockIndex];
            if (!block) return;
            block.classList.add('glance-active-block');
            block.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'center' });

            const type = getBlockType(block);
            const badge = document.getElementById('glance-block-badge');
            let readableType = type.charAt(0).toUpperCase() + type.slice(1);
            if (type === 'details') {
                const d = block.closest('details');
                if (d) {
                    readableType = d.open ? 'Details (Open)' : 'Details (Closed)';
                }
            }
            badge.textContent = readableType + ' [' + (currentBlockIndex + 1) + '/' + blocks.length + ']';
        }

        function toggleDetailsBlock() {
            if (blocks.length === 0) return;
            const activeBlock = blocks[currentBlockIndex];
            if (!activeBlock) return;

            const details = activeBlock.closest('details');
            if (!details) {
                return;
            }

            if (details.open) {
                details.open = false;
                blocks = discoverBlocks();
                const summary = details.querySelector(':scope > summary') || details;
                const newIdx = blocks.indexOf(summary);
                if (newIdx !== -1) {
                    currentBlockIndex = newIdx;
                } else {
                    currentBlockIndex = Math.min(currentBlockIndex, Math.max(0, blocks.length - 1));
                }
                updateActiveBlock(true);
                showToast('Closed Details');
            } else {
                details.open = true;
                blocks = discoverBlocks();
                const summary = details.querySelector(':scope > summary') || details;
                const newIdx = blocks.indexOf(summary);
                if (newIdx !== -1) {
                    currentBlockIndex = newIdx;
                }
                updateActiveBlock(true);
                renderMermaid();
                showToast('Opened Details');
            }
        }

        document.addEventListener('toggle', (e) => {
            if (e.target && e.target.tagName === 'DETAILS') {
                const prevActive = blocks[currentBlockIndex];
                blocks = discoverBlocks();
                if (prevActive && blocks.includes(prevActive)) {
                    currentBlockIndex = blocks.indexOf(prevActive);
                } else {
                    const sum = e.target.querySelector(':scope > summary') || e.target;
                    const idx = blocks.indexOf(sum);
                    if (idx !== -1) currentBlockIndex = idx;
                }
                updateActiveBlock(true);
            }
        }, true);

        function initBlocks() {
            renderTabBar();
            if (openDocs.length === 0) {
                document.getElementById('glance-block-badge').textContent = 'No Document';
                if (${options.autoSearch}) {
                    openSearchModal("${escapedQuery}");
                }
                return;
            }
            blocks = discoverBlocks();
            if (blocks.length > 0) {
                currentBlockIndex = Math.min(blocks.length - 1, ${options.initialBlockIndex});
                updateActiveBlock(true);
                renderMermaid().then(() => {
                    if (blocks.length > 0 && blocks[currentBlockIndex]) {
                        blocks[currentBlockIndex].scrollIntoView({ behavior: 'auto', block: 'center' });
                    }
                });
            }
            if (${options.autoSearch}) {
                openSearchModal("${escapedQuery}");
            }
        }

        setTimeout(initBlocks, 100);

        // --- NOTION-STYLE SEARCH MODAL LOGIC ---
        function openSearchModal(initialQuery = '') {
            const backdrop = document.getElementById('search-modal-backdrop');
            const input = document.getElementById('search-input');
            if (!backdrop || !input) return;

            backdrop.classList.add('open');
            isSearchOpen = true;
            input.value = initialQuery;
            input.focus();
            if (initialQuery) {
                input.select();
                triggerSearchQuery(initialQuery);
            } else {
                renderSearchResults();
            }
        }

        function closeSearchModal() {
            const backdrop = document.getElementById('search-modal-backdrop');
            if (!backdrop) return;
            backdrop.classList.remove('open');
            isSearchOpen = false;
            document.body.focus();
        }

        function triggerSearchQuery(query) {
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            const clean = query.trim();
            if (!clean) {
                searchResults = [];
                selectedResultIndex = 0;
                renderSearchResults();
                return;
            }
            searchDebounceTimer = setTimeout(() => {
                vscode.postMessage({ command: 'search', query: clean });
            }, 120);
        }

        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                triggerSearchQuery(e.target.value);
            });
            searchInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'u' || e.key === 'U')) {
                    e.preventDefault();
                    e.stopPropagation();
                    vscode.postMessage({ command: 'quit' });
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    closeSearchModal();
                    return;
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                        selectedResultIndex = Math.min(searchResults.length - 1, selectedResultIndex + 1);
                        renderSearchResults();
                        scrollSelectedIntoView();
                    }
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                        selectedResultIndex = Math.max(0, selectedResultIndex - 1);
                        renderSearchResults();
                        scrollSelectedIntoView();
                    }
                    return;
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchResults.length > 0 && searchResults[selectedResultIndex]) {
                        chooseSearchResult(searchResults[selectedResultIndex]);
                    }
                    return;
                }
            });
        }

        function scrollSelectedIntoView() {
            const list = document.getElementById('search-results-list');
            const selected = list ? list.querySelector('.search-result-item.selected') : null;
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
            }
        }

        function renderSearchResults() {
            const list = document.getElementById('search-results-list');
            if (!list) return;

            if (searchResults.length === 0) {
                list.innerHTML = '<div class="search-empty">Type keywords above to search documentation & code blocks...</div>';
                return;
            }

            list.innerHTML = searchResults.map((r, idx) => {
                const isSelected = idx === selectedResultIndex;
                const searchType = r.match_source === 'tantivy_fuzzy' ? '(Fuzzy Search)' : '(Index Search)';
                return '<div class="search-result-item ' + (isSelected ? 'selected' : '') + '" data-search-idx="' + idx + '">' +
                    '<div class="search-item-header">' +
                        '<span>' + escapeHtml(r.relative_path) + '</span>' +
                        '<span class="search-badge">' + searchType + '</span>' +
                    '</div>' +
                    '<div class="search-snippet">' + escapeHtml(r.snippet) + '</div>' +
                '</div>';
            }).join('');
        }

        const resultsListEl = document.getElementById('search-results-list');
        if (resultsListEl) {
            resultsListEl.addEventListener('click', (e) => {
                const item = e.target.closest('[data-search-idx]');
                if (item) {
                    const idx = parseInt(item.getAttribute('data-search-idx'), 10);
                    if (searchResults[idx]) {
                        chooseSearchResult(searchResults[idx]);
                    }
                }
            });
        }

        function chooseSearchResult(result) {
            vscode.postMessage({ command: 'selectDocument', result });
        }

        const backdropEl = document.getElementById('search-modal-backdrop');
        if (backdropEl) {
            backdropEl.addEventListener('click', (e) => {
                if (e.target === backdropEl) {
                    closeSearchModal();
                }
            });
        }

        // --- CUSTOM THEME APPLICATION ---
        function applyCustomPalette(p) {
            if (!p) return;
            const r = document.body.style;
            r.setProperty('--bg-color', p.bgColor);
            r.setProperty('--text-color', p.textColor);
            r.setProperty('--header-color', p.headerColor);
            r.setProperty('--code-bg', p.codeBg);
            r.setProperty('--border-color', p.borderColor);
            r.setProperty('--toast-bg', p.toastBg);
            r.setProperty('--toast-text', p.toastText);
            r.setProperty('--status-bg', p.statusBg);
            r.setProperty('--hints-color', p.hintsColor);
            r.setProperty('--hints-key', p.hintsKey);
            r.setProperty('--inline-code-color', p.inlineCodeColor);
            r.setProperty('--active-block-bg', p.activeBlockBg);
            r.setProperty('--link-color', p.linkColor);
            r.setProperty('--modal-bg', p.modalBg);
            r.setProperty('--modal-input-bg', p.modalInputBg);
            r.setProperty('--search-item-hover', p.searchItemHover);
            r.setProperty('--search-badge-bg', p.searchBadgeBg);
            r.setProperty('--search-badge-text', p.searchBadgeText);
            r.setProperty('--theme-red', p.themeRed);
        }

        function clearCustomPalette() {
            const vars = [
                '--bg-color', '--text-color', '--header-color', '--code-bg',
                '--border-color', '--toast-bg', '--toast-text', '--status-bg',
                '--hints-color', '--hints-key', '--inline-code-color', '--active-block-bg',
                '--link-color', '--modal-bg', '--modal-input-bg', '--search-item-hover',
                '--search-badge-bg', '--search-badge-text', '--theme-red'
            ];
            for (let i = 0; i < vars.length; i++) {
                document.body.style.removeProperty(vars[i]);
            }
        }

        // --- MERMAID OFFLINE RENDERING ---
        async function renderMermaid() {
            if (!window.mermaid) return;
            try {
                mermaid.parseError = function(err, hash) {
                    console.warn('[Mermaid parseError hook]', err);
                };
                const isLight = currentTheme === 'light' || (currentTheme === 'custom' && window.__isCustomLight);
                mermaid.initialize({
                    startOnLoad: false,
                    suppressErrorRendering: true,
                    theme: isLight ? 'default' : 'dark',
                    securityLevel: 'loose'
                });
                const divs = document.querySelectorAll('.mermaid');
                for (let i = 0; i < divs.length; i++) {
                    const el = divs[i];
                    const status = el.getAttribute('data-mermaid-status');
                    const renderedTheme = el.getAttribute('data-mermaid-theme');

                    if (status === 'error') {
                        continue;
                    }
                    if (status === 'rendered' && renderedTheme === currentTheme) {
                        continue;
                    }

                    const raw = el.getAttribute('data-raw-code') || el.textContent;
                    if (!raw || !raw.trim()) continue;

                    const id = 'cg-mermaid-' + Date.now() + '-' + i;
                    try {
                        const res = await mermaid.render(id, raw.trim());
                        if (res && res.svg) {
                            el.innerHTML = res.svg;
                            el.setAttribute('data-mermaid-status', 'rendered');
                            el.setAttribute('data-mermaid-theme', currentTheme);
                        }
                    } catch (blockErr) {
                        console.warn('[Mermaid] block render failed:', blockErr);
                        el.setAttribute('data-mermaid-status', 'error');

                        const strayIds = ['d' + id, id, 'd' + id + '-svg'];
                        for (const sId of strayIds) {
                            const stray = document.getElementById(sId);
                            if (stray && stray.parentNode) {
                                stray.parentNode.removeChild(stray);
                            }
                        }
                        const strayNodes = document.body.querySelectorAll('[id*="' + id + '"]');
                        strayNodes.forEach(node => {
                            if (node && node.parentNode && node !== el && !el.contains(node)) {
                                node.parentNode.removeChild(node);
                            }
                        });

                        const errMsg = (blockErr && (blockErr.message || blockErr.str)) ? String(blockErr.message || blockErr.str) : 'Syntax error in Mermaid diagram';
                        el.innerHTML = '<div class="mermaid-error-box">' +
                            '<div class="mermaid-error-header">' +
                                '<span class="mermaid-error-title">Mermaid Diagram Error</span>' +
                            '</div>' +
                            '<div class="mermaid-error-msg">' + escapeHtml(errMsg) + '</div>' +
                            '<pre class="mermaid-error-raw"><code>' + escapeHtml(raw.trim()) + '</code></pre>' +
                        '</div>';
                    }
                }
            } catch (err) {
                console.warn('[Mermaid] initialization error:', err);
            }
        }

        // --- HELP MODAL LOGIC ---
        let isHelpOpen = false;
        function openHelpModal() {
            const backdrop = document.getElementById('help-modal-backdrop');
            if (!backdrop) return;
            backdrop.classList.add('open');
            isHelpOpen = true;
        }

        function closeHelpModal() {
            const backdrop = document.getElementById('help-modal-backdrop');
            if (!backdrop) return;
            backdrop.classList.remove('open');
            isHelpOpen = false;
            document.body.focus();
        }

        const helpBtnEl = document.getElementById('help-pill-btn');
        if (helpBtnEl) {
            helpBtnEl.addEventListener('click', openHelpModal);
        }
        const helpBackdropEl = document.getElementById('help-modal-backdrop');
        if (helpBackdropEl) {
            helpBackdropEl.addEventListener('click', (e) => {
                if (e.target === helpBackdropEl) {
                    closeHelpModal();
                }
            });
        }
        const helpCloseTagEl = document.getElementById('help-close-tag');
        if (helpCloseTagEl) {
            helpCloseTagEl.addEventListener('click', closeHelpModal);
        }

        // --- RESPONSIVE VIEWPORT HANDLING ---
        let isTooSmallView = false;
        function handleResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;

            const tooSmallOverlay = document.getElementById('too-small-overlay');
            const mainContainer = document.getElementById('markdown-container');
            const topBar = document.getElementById('top-tab-bar');
            const statusBar = document.querySelector('.vim-status-bar');

            if (width < 640 || height < 180) {
                isTooSmallView = true;
                if (tooSmallOverlay) tooSmallOverlay.style.display = 'flex';
                if (mainContainer) mainContainer.style.display = 'none';
                if (topBar) topBar.style.display = 'none';
                if (statusBar) statusBar.style.display = 'none';
            } else {
                isTooSmallView = false;
                if (tooSmallOverlay) tooSmallOverlay.style.display = 'none';
                if (mainContainer) mainContainer.style.display = 'block';
                if (statusBar) statusBar.style.display = 'flex';
                if (openDocs.length > 0 && topBar) {
                    topBar.style.display = 'flex';
                    requestAnimationFrame(scrollActiveChipIntoView);
                }
            }
        }
        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 50);

        // --- EXTENSION IPC LISTENER ---
        window.addEventListener('message', (event) => {
            const message = event.data;
            if (!message || !message.command) return;

            switch (message.command) {
                case 'searchResults': {
                    searchResults = message.results || [];
                    selectedResultIndex = 0;
                    renderSearchResults();
                    break;
                }

                case 'openDocument': {
                    if (activeDocIndex >= 0 && openDocs[activeDocIndex]) {
                        openDocs[activeDocIndex].currentBlockIndex = currentBlockIndex;
                        openDocs[activeDocIndex].scrollTop = window.scrollY;
                    }

                    const existingIdx = openDocs.findIndex(d => 
                        (message.documentId && d.id === message.documentId) || 
                        (message.relativePath && d.relativePath === message.relativePath)
                    );

                    if (existingIdx !== -1) {
                        openDocs[existingIdx].html = message.renderedHtml;
                        openDocs[existingIdx].currentBlockIndex = message.targetBlockIdx || 0;
                        openDocs[existingIdx].scrollTop = 0;
                        switchToDoc(existingIdx);
                    } else {
                        const newDoc = {
                            id: message.documentId || ('doc_' + Date.now()),
                            title: message.title,
                            relativePath: message.relativePath,
                            html: message.renderedHtml,
                            currentBlockIndex: message.targetBlockIdx || 0,
                            scrollTop: 0
                        };
                        openDocs.push(newDoc);
                        switchToDoc(openDocs.length - 1);
                    }

                    closeSearchModal();
                    break;
                }

                case 'triggerSearch': {
                    openSearchModal(message.query || '');
                    break;
                }

                case 'setTheme': {
                    if (message.theme) {
                        currentTheme = message.theme;
                        document.body.setAttribute('data-theme', message.theme);
                        if (message.theme === 'custom' && message.customTheme) {
                            applyCustomPalette(message.customTheme);
                            window.__isCustomLight = !message.customTheme.isDark;
                        } else {
                            clearCustomPalette();
                            window.__isCustomLight = false;
                        }
                        renderMermaid();
                    }
                    break;
                }
            }
        });

        // --- KEYBOARD HANDLING ---
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
                return;
            }

            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
                return;
            }

            // GLOBAL: Ctrl+Alt+U closes tab in ANY state
            const isCloseTab = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'u' || e.key === 'U');
            if (isCloseTab) {
                e.preventDefault();
                e.stopPropagation();
                vscode.postMessage({ command: 'quit' });
                return;
            }

            // 1. IF TOO SMALL VIEW: ONLY accept 'q' (or Ctrl+Alt+U) to close tab
            if (isTooSmallView) {
                if (e.key === 'q' || e.key === 'Q') {
                    e.preventDefault();
                    e.stopPropagation();
                    vscode.postMessage({ command: 'quit' });
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                }
                return;
            }

            // 2. IF SEARCH MODAL IS OPEN:
            if (isSearchOpen) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeSearchModal();
                    return;
                }
                return;
            }

            // 3. IF HELP MODAL IS OPEN:
            if (isHelpOpen) {
                if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    closeHelpModal();
                    return;
                }
                return;
            }

            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            const isNextBlock = e.key === 'j' || e.key === 'ArrowDown';
            const isPrevBlock = e.key === 'k' || e.key === 'ArrowUp';
            const isTop = e.key === 't' || e.key === 'T';
            const isBottom = e.key === 'b' || e.key === 'B';
            const isNextCodeMath = e.key === 'n' || e.key === 'N';
            const isPrevCodeMath = e.key === 'p' || e.key === 'P';
            const isYank = e.key === 'y' || e.key === 'Y';
            const isSearch = e.key === 's' || e.key === 'S';
            const isPrevDoc = e.key === 'a' || e.key === 'A';
            const isNextDoc = e.key === 'd' || e.key === 'D';
            const isCloseDoc = e.key === 'x' || e.key === 'X';
            const isHelpToggle = e.key === 'h' || e.key === 'H';
            const isToggleDetails = e.key === ' ' || e.code === 'Space';

            const isSupported = isNextBlock || isPrevBlock || isTop || isBottom || isNextCodeMath || isPrevCodeMath || isYank || isSearch || isPrevDoc || isNextDoc || isCloseDoc || isHelpToggle || isToggleDetails;

            if (!isSupported) {
                if (e.key === 'Escape') {
                    showToast("Press Ctrl+Alt+U to close Context Glance");
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                showToast("Key '" + e.key + "' is not supported (press 'h' for help)");
                return;
            }

            if (openDocs.length === 0 && (isNextBlock || isPrevBlock || isTop || isBottom || isNextCodeMath || isPrevCodeMath || isYank || isCloseDoc || isPrevDoc || isNextDoc || isToggleDetails)) {
                e.preventDefault();
                showToast("Press 's' to search and open documentation");
                return;
            }

            // Space: Toggle Details / Summary Block
            if (isToggleDetails) {
                e.preventDefault();
                toggleDetailsBlock();
                return;
            }

            // Help Guide: 'h'
            if (isHelpToggle) {
                e.preventDefault();
                openHelpModal();
                return;
            }

            // Search: 's'
            if (isSearch) {
                e.preventDefault();
                openSearchModal();
                return;
            }

            // Previous Document Tab: 'a'
            if (isPrevDoc) {
                e.preventDefault();
                if (openDocs.length > 1) {
                    const newIdx = (activeDocIndex - 1 + openDocs.length) % openDocs.length;
                    switchToDoc(newIdx);
                }
                return;
            }

            // Next Document Tab: 'd'
            if (isNextDoc) {
                e.preventDefault();
                if (openDocs.length > 1) {
                    const newIdx = (activeDocIndex + 1) % openDocs.length;
                    switchToDoc(newIdx);
                }
                return;
            }

            // Close Open Document Tab: 'x'
            if (isCloseDoc) {
                e.preventDefault();
                closeDoc(activeDocIndex);
                return;
            }

            // First Content Block: 't'
            if (isTop) {
                e.preventDefault();
                if (blocks.length > 0) {
                    currentBlockIndex = 0;
                    updateActiveBlock();
                }
                return;
            }

            // Last Content Block: 'b'
            if (isBottom) {
                e.preventDefault();
                if (blocks.length > 0) {
                    currentBlockIndex = blocks.length - 1;
                    updateActiveBlock();
                }
                return;
            }

            // Next Content Block: 'j' or Down
            if (isNextBlock) {
                e.preventDefault();
                if (blocks.length > 0) {
                    currentBlockIndex = Math.min(blocks.length - 1, currentBlockIndex + 1);
                    updateActiveBlock();
                }
                return;
            }

            // Previous Content Block: 'k' or Up
            if (isPrevBlock) {
                e.preventDefault();
                if (blocks.length > 0) {
                    currentBlockIndex = Math.max(0, currentBlockIndex - 1);
                    updateActiveBlock();
                }
                return;
            }

            // Next Code or Math Block: 'n'
            if (isNextCodeMath) {
                e.preventDefault();
                let nextIdx = -1;
                for (let i = currentBlockIndex + 1; i < blocks.length; i++) {
                    if (isYankable(getBlockType(blocks[i]))) {
                        nextIdx = i;
                        break;
                    }
                }
                if (nextIdx !== -1) {
                    currentBlockIndex = nextIdx;
                    updateActiveBlock();
                } else {
                    showToast('No more Code or Math blocks below');
                }
                return;
            }

            // Previous Code or Math Block: 'p'
            if (isPrevCodeMath) {
                e.preventDefault();
                let prevIdx = -1;
                for (let i = currentBlockIndex - 1; i >= 0; i--) {
                    if (isYankable(getBlockType(blocks[i]))) {
                        prevIdx = i;
                        break;
                    }
                }
                if (prevIdx !== -1) {
                    currentBlockIndex = prevIdx;
                    updateActiveBlock();
                } else {
                    showToast('No more Code or Math blocks above');
                }
                return;
            }

            // Yank: 'y'
            if (isYank) {
                e.preventDefault();
                if (blocks.length === 0) return;

                const block = blocks[currentBlockIndex];
                if (!block) return;
                const type = getBlockType(block);

                if (type === 'code') {
                    let codeText = block.getAttribute('data-raw-code');
                    if (!codeText) {
                        const target = block.querySelector('[data-raw-code]');
                        if (target) codeText = target.getAttribute('data-raw-code');
                    }
                    if (!codeText) {
                        const pre = block.querySelector('pre') || (block.matches('pre') ? block : null);
                        if (pre) codeText = pre.innerText;
                    }
                    if (!codeText) codeText = block.innerText;

                    codeText = codeText.trim();
                    vscode.postMessage({ command: 'yank', text: codeText, blockType: 'code' });
                    showToast('Yanked Code to Clipboard!');
                } else if (type === 'math') {
                    let mathText = block.getAttribute('data-raw-math');
                    if (!mathText) {
                        const target = block.querySelector('[data-raw-math]');
                        if (target) mathText = target.getAttribute('data-raw-math');
                    }
                    if (!mathText) mathText = block.innerText;

                    mathText = mathText.trim();
                    vscode.postMessage({ command: 'yank', text: mathText, blockType: 'math' });
                    showToast('Yanked Math to Clipboard!');
                } else {
                    showToast('Only code and math blocks can be yanked');
                }
                return;
            }
        });
    `;
}
