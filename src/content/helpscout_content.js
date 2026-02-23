console.log("HELPSCOUT_CONTENT: Script injected.");

// Global Error Boundary
window.onerror = function (message, source, lineno, colno, error) {
    console.error("MAESTRO_CRITICAL_ERROR:", message, "at", lineno, ":", colno);
    const errDiv = document.createElement('div');
    errDiv.style.cssText = 'position: fixed; bottom: 0; left: 0; background: #fee2e2; color: #b91c1c; padding: 10px; font-size: 12px; z-index: 10002; border: 1px solid #ef4444;';
    errDiv.textContent = `Maestro Error: ${message} (Line ${lineno})`;
    document.documentElement.appendChild(errDiv);
    setTimeout(() => errDiv.remove(), 10000);
    return false;
};

// Visual confirmation for user
function showLoadIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'maestro-load-indicator';
    indicator.textContent = 'Maestro Assistant Loading...';
    indicator.style.cssText = 'position: fixed; top: 0; right: 0; background: #2563eb; color: #fff; padding: 4px 12px; font-size: 11px; font-weight: bold; z-index: 10001; border-bottom-left-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
    document.documentElement.appendChild(indicator);
    setTimeout(() => indicator.remove(), 4000);
}

const SELECTORS = {
    // Updated to support the span element provided by user and fallback to anchor
    CUSTOMER_EMAIL_LINK: '[data-testid="Sidebar.CustomerProfile"] .c-Truncate__content, .c-Truncate__content, a[data-testid="EmailList.EmailLink"]',
    // Attempt to find the customer name in the sidebar (usually an H1 or H2 inside the profile)
    CUSTOMER_NAME: '[data-testid="Sidebar.CustomerProfile"] h1, [data-testid="Sidebar.CustomerProfile"] h2, [data-testid="Sidebar.CustomerProfile"] h3',
    // Found in your HTML: <ol data-testid="ThreadContainer" ...>
    THREAD_CONTAINER: '[data-testid="ThreadContainer"]',
    // Found in your HTML: <li class="ThreadListItem ...">
    THREAD_ITEM: 'li.ThreadListItem',
    // Found in your HTML: <div class="... is-ignoring-table"> (contains message text)
    MESSAGE_BODY: '.is-ignoring-table',
    // Found in your HTML: <span data-nocollapse="true"> (contains sender name)
    SENDER_NAME: 'span[data-nocollapse="true"]',
    // The sticky reply bar at the bottom
    REPLY_BAR: '[data-testid="reply-bar"]',
    // The Spam folder in the sidebar
    SIDEBAR_SPAM: 'nav[data-testid="Sidenav.Section"] a[aria-label="Spam"], [data-testid="Sidenav.Section"] a',
    CONVERSATION_LIST: '.c-ConversationList, [data-testid="ConversationList"], .Listcss__ListUI-sc-om7u8i-0',
    CONVERSATION_ITEM: 'li.Listcss__ListItemUI-sc-om7u8i-1, li',
    MODAL_CONTAINER: '.c-Modal'
};

// --- PERFORMANCE MONITORING & OPTIMIZATION ---
// Optimized for minimum overhead
const MaestroPerf = {
    logs: [],
    instabilities: 0,
    startTime: Date.now(),
    isOptimized: false,

    init() {
        console.log("MAESTRO_PERF: Diagnostic monitor active.");
        this.observeLongTasks();
        this.observeLayoutShifts();

        // Final report after 10s of activity
        setTimeout(() => this.printStabilityReport(), 10000);
    },

    log(type, data, severity = 'info') {
        const entry = { timestamp: new Date().toISOString(), type, data, severity };
        this.logs.push(entry);
        if (severity === 'warning' || severity === 'critical') {
            this.instabilities++;
            console.warn(`[MAESTRO_PERF][${type}] ${data}`);

            // Auto-optimize if instabilities build up
            if (this.instabilities > 3 && !this.isOptimized) {
                this.applyEmergencyOptimizations();
            }
        }
    },

    observeLongTasks() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        this.log('Long Task', `UI Blocked for ${Math.round(entry.duration)}ms`, entry.duration > 150 ? 'critical' : 'warning');
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) { console.warn("MAESTRO_PERF: LongTask observer not supported."); }
    },

    observeLayoutShifts() {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.hadRecentInput) return;
                    this.log('Layout Shift', `CLS entry: ${entry.value.toFixed(4)}`, entry.value > 0.1 ? 'warning' : 'info');
                }
            });
            observer.observe({ type: 'layout-shift', buffered: true });
        } catch (e) { }
    },

    applyEmergencyOptimizations() {
        this.isOptimized = true;
        console.log("MAESTRO_PERF: Detected instability. Applying emergency optimizations...");

        const style = document.createElement('style');
        style.id = 'maestro-emergency-perf';
        style.textContent = `
            /* Reduce Layout Thrashing */
            .ThreadListItem { content-visibility: auto; contain-intrinsic-size: 100px; }
            [data-testid="Sidebar.CustomerProfile"] { contain: content; }
            
            /* Disable intensive native blurs/shadows */
            .c-Modal, .c-Beacon { box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important; filter: none !important; }
            
            /* Hide the CPU-heavy Beacon if not in use */
            #hs-beacon-container:not(:hover), .hs-beacon-no-show { opacity: 0.1; pointer-events: none; transition: opacity 0.5s; }
        `;
        document.head.appendChild(style);
    },

    printStabilityReport() {
        const duration = (Date.now() - this.startTime) / 1000;
        console.group("%c Maestro Performance Stability Report ", "background: #1e293b; color: #fff; padding: 4px; border-radius: 4px;");
        console.log(`Active Session: ${duration.toFixed(1)}s`);
        console.log(`Total Instabilities Detected: ${this.instabilities}`);
        console.log(`Status: ${this.instabilities === 0 ? 'ðŸŸ¢ Stable' : this.instabilities < 5 ? 'ðŸŸ¡ Minor Lag' : 'ðŸ”´ Unstable'}`);
        console.log("Details:", this.logs);
        console.groupEnd();
    }
};

// Initialize performance monitoring
MaestroPerf.init();

/**
 * Creates and injects a "Search Maestro" button next to the email in the sidebar.
 */
function injectSidebarSearchButton() {
    console.log("MAESTRO: Running injectSidebarSearchButton...");
    // 1. Find the email
    const candidates = document.querySelectorAll(SELECTORS.CUSTOMER_EMAIL_LINK);
    let emailLink = null;
    for (const el of candidates) {
        if (el.textContent.includes('@')) {
            emailLink = el;
            break;
        }
    }
    if (!emailLink) {
        console.warn("MAESTRO: Customer email link not found.");
        return;
    }

    // 2. Target the injection point (after conversations plugin)
    let conversationsSection = document.getElementById('plugin-conversations');
    if (!conversationsSection) {
        const sections = document.querySelectorAll('section, div[class*="Section"]');
        for (const s of sections) {
            if (s.innerText.includes('Conversations') && (s.querySelector('ul') || s.id.includes('conversation'))) {
                conversationsSection = s;
                break;
            }
        }
    }

    if (!conversationsSection || !conversationsSection.parentNode) {
        console.warn("MAESTRO: No conversation section found in sidebar.");
        return;
    }

    // 3. Create or get the Main Assistant Panel
    let assistantPanel = document.getElementById('maestro-assistant-panel');
    if (assistantPanel && assistantPanel.previousElementSibling !== conversationsSection) {
        assistantPanel.remove();
        assistantPanel = null;
    }

    if (!assistantPanel) {
        assistantPanel = document.createElement('div');
        assistantPanel.id = 'maestro-assistant-panel';
        assistantPanel.style.cssText = `
            margin: 10px 0;
            background: #ffffff;
            border: 1px solid #e3e8eb;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        `;

        // Panel Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #f8fafc;
            padding: 8px 12px;
            border-bottom: 1px solid #e3e8eb;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        header.innerHTML = `
            <img src="https://maestro.smyleteam.com/assets/images/maestr-m.png" style="width: 16px; height: 16px;">
            <span style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Maestro Assistant</span>
        `;
        assistantPanel.appendChild(header);

        // Content Wrapper
        const content = document.createElement('div');
        content.id = 'maestro-assistant-content';
        content.style.cssText = 'padding: 10px; display: flex; flex-direction: column; gap: 10px;';
        assistantPanel.appendChild(content);

        conversationsSection.parentNode.insertBefore(assistantPanel, conversationsSection.nextSibling);
    }

    const panelContent = assistantPanel.querySelector('#maestro-assistant-content');

    // --- INTERNAL HELPERS ---
    const createSection = (id, title) => {
        let section = document.getElementById(id);
        if (!section) {
            section = document.createElement('div');
            section.id = id;
            section.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

            if (title) {
                const label = document.createElement('div');
                label.textContent = title;
                label.style.cssText = 'font-size: 9px; font-weight: 700; color: #555; text-transform: uppercase; margin-bottom: 2px;';
                section.appendChild(label);
            }
            panelContent.appendChild(section);
        }
        return section;
    };

    const createRow = (parentId, rowId) => {
        const parent = document.getElementById(parentId);
        let row = document.getElementById(rowId);
        if (!row) {
            row = document.createElement('div');
            row.id = rowId;
            row.style.cssText = 'display: flex; gap: 4px; width: 100%;';
            parent.appendChild(row);
        }
        return row;
    };

    const createOrUpdateBtn = (id, title, iconHtml, bgColor, onClickHandler, targetContainer, valueGetter, customStyle = {}) => {
        let btn = document.getElementById(id);
        if (!btn) {
            btn = document.createElement('button');
            btn.id = id;
            btn.title = title;
            btn.innerHTML = iconHtml;
            btn.style.cssText = `
                height: 32px;
                padding: 0 10px;
                background-color: #ffffff;
                color: #1e293b;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                font-family: inherit;
                font-size: 11px;
                font-weight: 600;
            `;
            if (customStyle) Object.assign(btn.style, customStyle);

            btn.onmouseenter = () => {
                btn.style.transform = 'translateY(-1px)';
                btn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                if (bgColor === '#ffffff' || bgColor === '#fff') {
                    btn.style.backgroundColor = '#f8fafc';
                    btn.style.borderColor = '#cbd5e1';
                } else {
                    btn.style.filter = 'brightness(1.1)';
                }
            };
            btn.onmouseleave = () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = 'none';
                btn.style.backgroundColor = bgColor;
                if (bgColor === '#ffffff' || bgColor === '#fff') {
                    btn.style.borderColor = '#e2e8f0';
                } else {
                    btn.style.filter = 'none';
                }
            };

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const val = valueGetter ? valueGetter() : null;
                onClickHandler(val);
            };
            targetContainer.appendChild(btn);
        } else if (btn.parentNode !== targetContainer) {
            targetContainer.appendChild(btn);
        }
    };

    const getEmail = () => {
        const el = Array.from(document.querySelectorAll(SELECTORS.CUSTOMER_EMAIL_LINK)).find(n => n.textContent.includes('@'));
        return el ? el.textContent.trim() : '';
    };

    const getName = () => {
        const sidebarName = document.querySelector('[data-cy="Sidebar.CustomerName"] .c-Truncate__content');
        if (sidebarName) return sidebarName.textContent.trim();
        const nameEl = document.querySelector(SELECTORS.CUSTOMER_NAME);
        return nameEl ? nameEl.textContent.trim() : '';
    };

    // --- SECTION 1: SEARCH TOOLS ---
    const searchSection = createSection('maestro-search-section', 'Search Tools');

    // Magic Row (Prominent)
    const magicRow = createRow('maestro-search-section', 'maestro-magic-row');
    createOrUpdateBtn('maestro-magic-search-btn', 'Magic Cross-Tab Search',
        `<img src="https://maestro.smyleteam.com/assets/images/maestr-m.png" style="width: 14px; height: 14px; margin-right: 8px;"><strong>MAGIC SEARCH</strong>`,
        '#f0f9ff',
        (e) => {
            if (!e) return;
            chrome.runtime.sendMessage({ action: 'searchCrossTab', searchTerm: e });
        },
        magicRow, getEmail,
        {
            height: '38px',
            width: '100%',
            color: '#0369a1',
            borderColor: '#bae6fd',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }
    );

    // Standard Sub-Rows
    const subGrid = createRow('maestro-search-section', 'maestro-sub-grid');
    subGrid.style.display = 'grid';
    subGrid.style.gridTemplateColumns = '1fr 1fr';
    subGrid.style.gap = '4px';

    createOrUpdateBtn('maestro-cust-email-btn', 'Maestro (Email)',
        `Maestro Email`, '#ffffff',
        (e) => chrome.runtime.sendMessage({ action: "searchMaestroCustomer", searchTerm: e, openInBackground: true }),
        subGrid, getEmail, { fontSize: '10px' }
    );
    createOrUpdateBtn('maestro-cust-name-btn', 'Maestro (Name)',
        `Maestro Name`, '#ffffff',
        (n) => chrome.runtime.sendMessage({ action: "searchMaestroCustomer", searchTerm: n, openInBackground: true }),
        subGrid, getName, { fontSize: '10px' }
    );

    // --- SECTION 2: AI & AUTOMATIONS ---
    const macroSection = createSection('maestro-macro-section', 'AI & Automations');

    const macroGrid = createRow('maestro-macro-section', 'maestro-macro-grid');
    macroGrid.style.display = 'grid';
    macroGrid.style.gridTemplateColumns = '1fr 1fr';
    macroGrid.style.gap = '4px';

    createOrUpdateBtn('maestro-macro-sum-btn', 'Summarize with AI',
        `<span>🌟</span> Summary`, '#fdf2f8',
        () => {
            const btn = document.getElementById('maestro-macro-sum-btn');
            btn.innerHTML = '⏳...';
            const threads = Array.from(document.querySelectorAll('.thread-body, .message-content')).map(t => t.innerText).join('\n---\n');
            chrome.runtime.sendMessage({ action: 'summarizeWithGroq', text: threads }, (response) => {
                btn.innerHTML = `<span>🌟</span> Summary`;
                if (response && response.success) { alert(`AI Summary:\n\n${response.reply}`); }
                else { alert(`Error: ${response?.error || 'Failed'}`); }
            });
        },
        macroGrid, null, { color: '#db2777', borderColor: '#fbcfe8', height: '36px' }
    );

    createOrUpdateBtn('maestro-macro-wrap-btn', 'Done & Note Macro',
        `<span>⚡</span> Wrap-Up`, '#6366f1',
        async () => {
            const btn = document.getElementById('maestro-macro-wrap-btn');
            btn.innerHTML = '⏳...';
            try {
                const replyTrigger = document.querySelector('.c-ReplyBarToggler__button, [data-testid="reply-bar-toggler"]');
                if (replyTrigger) replyTrigger.click();
                await new Promise(r => setTimeout(r, 200));
                btn.innerHTML = '✅ Done';
            } catch (err) { btn.innerHTML = '❌ Err'; }
            setTimeout(() => btn.innerHTML = `<span>⚡</span> Wrap-Up`, 2000);
        },
        macroGrid, null, { color: '#fff', border: 'none', height: '36px' }
    );

    // --- SECTION 3: EXTERNAL APPS ---
    const externalSection = createSection('maestro-external-section', 'External Apps');
    const extGrid = createRow('maestro-external-section', 'maestro-ext-grid');
    extGrid.style.display = 'grid';
    extGrid.style.gridTemplateColumns = '1fr 1fr';
    extGrid.style.gap = '4px';

    createOrUpdateBtn('ss-email-btn', 'SS Email', `SS Email`, '#10b981',
        (e) => chrome.runtime.sendMessage({ action: "searchShipStation", searchTerm: e, openInBackground: true }),
        extGrid, getEmail, { color: '#fff', border: 'none', fontSize: '10px' }
    );
    createOrUpdateBtn('ss-name-btn', 'SS Name', `SS Name`, '#10b981',
        (n) => chrome.runtime.sendMessage({ action: "searchShipStation", searchTerm: n, openInBackground: true }),
        extGrid, getName, { color: '#fff', border: 'none', fontSize: '10px' }
    );
    createOrUpdateBtn('stripe-btn', 'Stripe', `Stripe`, '#635bff',
        (e) => chrome.runtime.sendMessage({ action: "searchStripe", searchTerm: e, openInBackground: true }),
        extGrid, getEmail, { color: '#fff', border: 'none', fontSize: '10px' }
    );
    createOrUpdateBtn('giddyup-btn', 'GiddyUp', `GiddyUp`, '#f97316',
        (e) => chrome.runtime.sendMessage({ action: "searchGiddyUp", searchTerm: e, openInBackground: true }),
        extGrid, getEmail, { color: '#fff', border: 'none', fontSize: '10px' }
    );

    // Tracking
    createOrUpdateBtn('maestro-grab-tracking-btn', 'Grab Tracking', `📦 GRAB TRACKING`, '#ffffff',
        (e) => fetchAndDisplayTracking(e),
        panelContent, getEmail, { width: '100%', height: '36px', fontWeight: '800', marginTop: '5px' }
    );

    // Stability
    createOrUpdateBtn('maestro-perf-report-btn', 'Perf', `📊 Stability`, '#ffffff',
        () => MaestroPerf.printStabilityReport(),
        panelContent, null, { width: '100%', opacity: '0.5', fontSize: '9px', marginTop: '5px' }
    );
}

/**
 * Fetches tracking info via background and displays it in the sidebar.
 */
function fetchAndDisplayTracking(email) {
    const btn = document.getElementById('maestro-grab-tracking-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span>â³</span> Syncing...';
    btn.disabled = true;

    // 1. Scrape current conversation (Instant)
    const scraped = scrapeConversationForTracking();
    const results = { tracking: scraped, errors: [] };

    // 2. Check local tracking cache for this email
    chrome.storage.local.get('trackingCache', (cacheData) => {
        const cache = cacheData.trackingCache || {};
        const emailKey = email.toLowerCase();

        if (cache[emailKey]) {
            console.log(`HELPSCOUT_CONTENT: Found cached tracking for ${emailKey}`);
            cache[emailKey].tracking.forEach(trk => {
                if (!results.tracking.some(existing => existing.number === trk.number)) {
                    results.tracking.push({
                        ...trk,
                        source: 'Maestro-Cache'
                    });
                }
            });
        }

        // 3. Display Combined Results
        displayTrackingResults(results);
    });
}

/**
 * Scans the current conversation history for tracking numbers.
 */
function scrapeConversationForTracking() {
    const thread = document.querySelector(SELECTORS.THREAD_CONTAINER);
    if (!thread) return [];

    const text = thread.innerText;
    const findings = [];

    // Regex patterns for common carriers
    const carriers = [
        { name: 'UPS', regex: /\b1Z[A-Z0-9]{16}\b/g },
        { name: 'USPS', regex: /\b9[42]\d{18,20}\b/g },
        { name: 'FedEx', regex: /\b\d{12,15}\b/g }, // Standard FedEx is 12 digits
        { name: 'DHL', regex: /\b\d{10}\b/g }        // DHL is often 10 digits
    ];

    carriers.forEach(carrier => {
        const matches = text.match(carrier.regex);
        if (matches) {
            matches.forEach(m => {
                if (!findings.some(f => f.number === m)) {
                    findings.push({ source: 'Conversation', type: carrier.name, number: m });
                }
            });
        }
    });

    return findings;
}

function displayTrackingResults(data) {
    const container = document.getElementById('maestro-assistant-content');
    if (!container) return;

    // Remove existing results box if any
    const existing = document.getElementById('maestro-tracking-results-box');
    if (existing) existing.remove();

    const box = document.createElement('div');
    box.id = 'maestro-tracking-results-box';
    box.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    `;

    // 1. Errors Section (If any)
    if (data.errors && data.errors.length > 0) {
        data.errors.forEach(err => {
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'font-size: 11px; color: #b91c1c; background: #fee2e2; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #ef4444;';
            errDiv.textContent = err;
            box.appendChild(errDiv);
        });
    }

    // 2. Tracking Section
    if (data.tracking && data.tracking.length > 0) {
        const title = document.createElement('div');
        title.textContent = "Found Tracking:";
        title.style.cssText = "font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 2px;";
        box.appendChild(title);

        data.tracking.forEach(trk => {
            const row = document.createElement('div');
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 8px;";

            const label = document.createElement('span');
            label.style.cssText = "font-size: 12px; font-weight: 600; color: #1e293b;";
            label.textContent = `${trk.source} (${trk.type}):`;

            const val = document.createElement('a');
            val.href = trk.link || "#";
            val.target = "_blank";
            val.textContent = trk.number;
            val.style.cssText = "font-size: 12px; color: #2563eb; text-decoration: underline; flex: 1; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

            const copyBtn = document.createElement('button');
            copyBtn.innerHTML = "ðŸ“‹";
            copyBtn.style.cssText = "background: none; border: none; cursor: pointer; font-size: 12px; padding: 2px;";
            copyBtn.onclick = (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(trk.number).then(() => {
                    copyBtn.textContent = "âœ…";
                    setTimeout(() => copyBtn.textContent = "ðŸ“‹", 1000);
                });
            };

            row.appendChild(label);
            row.appendChild(val);
            row.appendChild(copyBtn);
            box.appendChild(row);
        });
    } else if (!data.errors || data.errors.length === 0) {
        // No errors OR tracking
        const noData = document.createElement('div');
        noData.style.cssText = 'font-size: 11px; color: #64748b; padding: 4px; font-style: italic;';
        noData.textContent = "No tracking found for this email.";
        box.appendChild(noData);
    }

    container.appendChild(box);
}

/**
 * Scrapes the conversation history to send to the AI.
 */
function scrapeConversation() {
    const container = document.querySelector(SELECTORS.THREAD_CONTAINER);
    if (!container) return "No conversation found.";

    const items = container.querySelectorAll(SELECTORS.THREAD_ITEM);
    let transcript = [];

    items.forEach(item => {
        const senderEl = item.querySelector(SELECTORS.SENDER_NAME);
        const bodyEl = item.querySelector(SELECTORS.MESSAGE_BODY);

        if (senderEl && bodyEl) {
            const sender = senderEl.textContent.trim();
            const text = bodyEl.innerText.trim();
            // Simple logic to distinguish agent vs customer based on your HTML structure
            const role = (item.classList.contains('is-customer')) ? 'Customer' : 'Agent';

            transcript.push(`${role} (${sender}): ${text}`);
        }
    });

    // Return the first message (original issue) + the last 9 messages
    // This ensures the AI knows the root cause even in long threads
    if (transcript.length > 10) {
        const firstMsg = transcript[0];
        const recentMsgs = transcript.slice(-9);
        return [firstMsg, ...recentMsgs].join('\n\n');
    }
    return transcript.join('\n\n');
}

/**
 * Injects the AI Assistant UI. 
 */
function injectAiAssistant() {
    console.log("MAESTRO: Running injectAiAssistant...");
    // We look for the Spam folder in the sidebar to insert our AI tool below it
    const spamFolder = document.querySelector(SELECTORS.SIDEBAR_SPAM);
    if (!spamFolder) {
        console.warn("MAESTRO: Sidebar Spam folder not found. Cannot inject AI assistant.");
        return;
    }
    if (document.getElementById('maestro-ai-assistant-container')) return;

    const container = document.createElement('div');
    container.id = 'maestro-ai-assistant-container';
    container.style.cssText = `
        margin-top: 15px;
        padding: 0 12px;
        width: 100%;
        box-sizing: border-box;
    `;

    // 1. Create Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.innerHTML = '<span>ðŸ¤–</span> Maestro AI';
    toggleBtn.style.cssText = `
        background: transparent;
        border: 1px solid #d1e6f9;
        color: #4a5e70;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        width: 100%;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.2s;
    `;
    toggleBtn.onmouseover = () => toggleBtn.style.background = '#f1f5f9';
    toggleBtn.onmouseout = () => { if (contentDiv.style.display === 'none') toggleBtn.style.background = 'transparent'; };

    // 2. Create Content Area (Hidden by default)
    const contentDiv = document.createElement('div');
    contentDiv.id = 'maestro-ai-content';
    contentDiv.style.cssText = `
        display: none;
        padding: 12px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-top: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    `;

    contentDiv.innerHTML = `
        <div style="margin-bottom: 10px;">
            <input type="text" id="ai-instruction" placeholder="Instructions..." style="width: 100%; padding: 8px; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 6px; box-sizing: border-box; font-size: 12px; transition: border-color 0.2s;">
        </div>
        <button id="ai-gen-btn" style="width: 100%; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-bottom: 10px; font-weight: 700; transition: all 0.2s;">Generate Reply</button>
        <textarea id="ai-result" placeholder="..." style="width: 100%; height: 140px; display: none; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; font-size: 12px; padding: 10px; box-sizing: border-box; resize: vertical; font-family: inherit; border-radius: 6px;"></textarea>
        <button id="ai-copy-btn" style="width: 100%; display: none; margin-top: 8px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; transition: all 0.2s;">Copy to Clipboard</button>
    `;

    container.appendChild(toggleBtn);
    container.appendChild(contentDiv);

    // Insert after the spam folder
    if (spamFolder.parentNode) {
        spamFolder.parentNode.insertBefore(container, spamFolder.nextSibling);
    }

    // Toggle Logic
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isHidden = contentDiv.style.display === 'none';
        contentDiv.style.display = isHidden ? 'block' : 'none';
        toggleBtn.style.background = isHidden ? '#f1f5f9' : 'transparent';
    });

    // Usability: Allow Ctrl+Enter to trigger generation
    document.getElementById('ai-instruction').addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            document.getElementById('ai-gen-btn').click();
        }
    });

    // Event Listeners
    document.getElementById('ai-gen-btn').addEventListener('click', () => {
        const instructions = document.getElementById('ai-instruction').value;
        const conversation = scrapeConversation();
        const emailLink = document.querySelector(SELECTORS.CUSTOMER_EMAIL_LINK);
        const customerInfo = emailLink ? `Customer Email: ${emailLink.textContent.trim()}` : "Customer Info: N/A";

        const btn = document.getElementById('ai-gen-btn');
        btn.textContent = "Generating...";
        btn.disabled = true;

        chrome.runtime.sendMessage({
            action: "generateSuggestion",
            data: {
                ticketThread: conversation,
                customerInfo: customerInfo,
                specialInstructions: instructions
            }
        });
    });

    document.getElementById('ai-copy-btn').addEventListener('click', (e) => {
        const resultArea = document.getElementById('ai-result');
        navigator.clipboard.writeText(resultArea.value).then(() => {
            showCopiedTooltip(e.clientX, e.clientY);
            const copyBtn = document.getElementById('ai-copy-btn');
            copyBtn.textContent = "Copied!";
            setTimeout(() => copyBtn.textContent = "Copy to Clipboard", 2000);
        });
    });
}

/**
 * Displays a "Copied!" tooltip near the cursor.
 * @param {number} x - The clientX position of the cursor.
 * @param {number} y - The clientY position of the cursor.
 */
function showCopiedTooltip(x, y) {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Copied!';
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y - 30}px`; // Above cursor
    tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '99999';
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(10px)';
    tooltip.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    tooltip.style.pointerEvents = 'none'; // So it doesn't interfere with other clicks

    document.body.appendChild(tooltip);

    // Animate in
    setTimeout(() => {
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(10px)';
        setTimeout(() => tooltip.remove(), 200);
    }, 1200);
}

/**
 * Helper to trigger the "Search All" action
 */
function triggerSearchAll(term, type = 'email') {
    if (!term) return;
    console.log(`HELPSCOUT_CONTENT: Triggering Search All (${type}) for:`, term);
    chrome.runtime.sendMessage({
        action: "searchAllApps",
        searchTerm: term,
        searchType: type,
        openInBackground: true
    });
}

// --- SELECTION SEARCH POPUP ---

function initSelectionPopup() {
    // 1. Create the popup element if it doesn't exist
    let popup = document.getElementById('maestro-selection-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'maestro-selection-popup';
        popup.style.cssText = `
            position: absolute;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            z-index: 10000;
            padding: 6px;
            display: none;
            flex-direction: row;
            gap: 6px;
            transition: opacity 0.15s ease-in-out;
        `;
        // Prevent clicks inside the popup from hiding it immediately
        popup.addEventListener('mousedown', e => e.stopPropagation());
        document.body.appendChild(popup);
    }

    // 2. Add event listeners to show/hide the popup
    document.addEventListener('mouseup', handleTextSelection);
    // Use a click listener on the document to hide, as mousedown can feel too quick
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#maestro-selection-popup')) {
            hideSelectionPopup();
        }
    });
}

function hideSelectionPopup() {
    const popup = document.getElementById('maestro-selection-popup');
    if (popup && popup.style.display !== 'none') {
        popup.style.opacity = '0';
        setTimeout(() => {
            popup.style.display = 'none';
        }, 150); // Match transition
    }
}

function handleTextSelection(event) {
    // Don't show popup if we're clicking inside an existing one or on an input/textarea
    if (event.target.closest('#maestro-selection-popup') || ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        return;
    }

    // Use a small delay to not conflict with double-click-to-select
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText.length > 2 && selectedText.length < 100) { // Only show for reasonably long selections
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Position the popup above the selection
            const popupX = rect.left + (rect.width / 2); // Centered horizontally
            const popupY = window.scrollY + rect.top - 45; // 45px above the selection

            showSelectionPopup(popupX, popupY, selectedText);
        } else {
            hideSelectionPopup();
        }
    }, 10);
}

function showSelectionPopup(x, y, text) {
    const popup = document.getElementById('maestro-selection-popup');
    if (!popup) return;

    // Clear previous buttons
    popup.innerHTML = '';

    // Determine if it's an email or a name
    const isEmail = text.includes('@') && text.includes('.');
    const searchType = isEmail ? 'email' : 'name';

    // Button definitions
    const buttons = [
        {
            id: 'maestro',
            title: 'Search Maestro',
            icon: `<img src="https://maestro.smyleteam.com/assets/images/maestr-m.png" style="width: 20px; height: 20px;" alt="M">`,
            action: 'searchMaestroApp'
        },
        {
            id: 'shipstation',
            title: 'Search ShipStation',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4h-8v-8Z"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>`,
            action: 'searchShipStation'
        },
        {
            id: 'stripe',
            title: 'Search Stripe',
            icon: `<svg fill="#475569" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px;"><path d="M13.706 9.663c0-1.394 1.162-1.931 3.025-1.931 2.713 0 6.156 0.831 8.869 2.294v-8.393c-2.956-1.181-5.906-1.631-8.863-1.631-7.231 0-12.050 3.775-12.050 10.087 0 9.869 13.55 8.269 13.55 12.525 0 1.65-1.431 2.181-3.419 2.181-2.95 0-6.763-1.219-9.756-2.844v8.031c3.079 1.329 6.396 2.017 9.75 2.025 7.413 0 12.519-3.188 12.519-9.6 0-10.637-13.625-8.731-13.625-12.744z"></path></svg>`,
            action: 'searchStripe'
        },
        {
            id: 'helpscout',
            title: 'Search HelpScout',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16"/><path d="M20 4v16"/><path d="M4 12h16"/></svg>`,
            customAction: (searchTerm) => {
                // Since we are already on HelpScout, we can just change the URL.
                window.location.href = `https://secure.helpscout.net/search/?query=${encodeURIComponent(searchTerm)}`;
            }
        }
    ];

    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.title = `${b.title} for "${text}"`;
        btn.innerHTML = b.icon;
        btn.style.cssText = `
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        `;
        btn.onmouseover = () => btn.style.backgroundColor = '#f1f5f9';
        btn.onmouseout = () => btn.style.backgroundColor = 'transparent';

        btn.addEventListener('click', () => {
            console.log(`HELPSCOUT_CONTENT: Selection search for ${b.id} (${searchType}): "${text}"`);
            if (b.customAction) {
                b.customAction(text);
            } else {
                chrome.runtime.sendMessage({
                    action: b.action,
                    searchTerm: text,
                    openInBackground: true // Assume background tab is preferred for this feature
                });
            }
            hideSelectionPopup();
        });
        popup.appendChild(btn);
    });

    // Position and show
    popup.style.display = 'flex';
    popup.style.opacity = '1';
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = 'translateX(-50%)';

    // Adjust position to not be off-screen
    const popupRect = popup.getBoundingClientRect();
    if (popupRect.right > window.innerWidth) {
        popup.style.left = `${window.innerWidth - popupRect.width - 10}px`;
        popup.style.transform = 'translateX(0)'; // Reset transform if we adjust
    }
    if (popupRect.left < 0) {
        popup.style.left = '10px';
        popup.style.transform = 'translateX(0)'; // Reset transform if we adjust
    }
}


chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'displaySuggestion' || req.action === 'displayError') {
        const resultArea = document.getElementById('ai-result');
        const copyBtn = document.getElementById('ai-copy-btn');
        const genBtn = document.getElementById('ai-gen-btn');
        const contentDiv = document.getElementById('maestro-ai-content');

        if (resultArea) {
            resultArea.value = req.suggestion || req.error;
            resultArea.style.display = 'block';
            if (contentDiv) contentDiv.style.display = 'block';
        }
        if (copyBtn && req.suggestion) copyBtn.style.display = 'inline-block';
        if (genBtn) {
            genBtn.textContent = "Generate Reply";
            genBtn.disabled = false;
        }
    }
    else if (req.action === "extractCustomerEmail") { // Listen for the message from the popup
        console.log("HELPSCOUT_CONTENT: Received 'extractCustomerEmail' request from popup.");
        const candidates = document.querySelectorAll(SELECTORS.CUSTOMER_EMAIL_LINK);
        let email = '';
        for (const el of candidates) {
            if (el.textContent.includes('@')) {
                email = el.textContent.trim();
                break;
            }
        }
        if (email) {
            sendResponse({
                data: {
                    customerEmail: email
                }
            });
        } else {
            console.error("HELPSCOUT_CONTENT: Could not find customer email link for popup extraction.");
            sendResponse({ error: "HelpScout Page: Could not find customer email." });
        }
        return true; // Keep channel open for async response
    }
});

/**
 * Finds all conversations from the sidebar's "Conversations" section
 */
async function findConversationsToMerge(customerEmail) {
    if (!customerEmail) {
        console.warn('MAESTRO_MERGE: No customer email provided');
        return [];
    }

    console.log(`MAESTRO_MERGE: Searching for conversations in sidebar`);

    // Get current conversation ID from URL
    const currentConvId = getCurrentConversationId();
    console.log(`MAESTRO_MERGE: Current conversation ID: ${currentConvId}`);

    // Find the conversations section in the sidebar
    const conversationsSection = document.querySelector('#plugin-conversations');
    if (!conversationsSection) {
        console.warn('MAESTRO_MERGE: Could not find #plugin-conversations section');
        return [];
    }

    // Find all conversation links within that section
    const conversationLinks = conversationsSection.querySelectorAll('a[href*="/conversation/"]');
    console.log(`MAESTRO_MERGE: Found ${conversationLinks.length} conversation links in sidebar`);

    const matchingConversations = [];
    const seenIds = new Set();

    conversationLinks.forEach(link => {
        try {
            const href = link.getAttribute('href');
            const match = href.match(/\/conversation\/(\d+)/);

            if (match && match[1] !== currentConvId && !seenIds.has(match[1])) {
                seenIds.add(match[1]);

                // Get the subject from the link text
                const textWrapper = link.querySelector('.Buttoncss__TextUI-sc-dej3fd-3, [class*="TextUI"]');
                let subject = 'Conversation #' + match[1];

                if (textWrapper && textWrapper.textContent.trim()) {
                    subject = textWrapper.textContent.trim();
                } else if (link.textContent.trim()) {
                    subject = link.textContent.trim();
                }

                matchingConversations.push({
                    id: match[1],
                    subject: subject,
                    email: customerEmail,
                    url: href
                });

                console.log(`MAESTRO_MERGE: Found conversation: ${match[1]} - ${subject}`);
            }
        } catch (e) {
            console.warn('MAESTRO_MERGE: Error processing conversation link:', e);
        }
    });

    console.log(`MAESTRO_MERGE: Found ${matchingConversations.length} conversations to merge`);
    return matchingConversations;
}

/**
 * Gets the current conversation ID from the URL
 */
function getCurrentConversationId() {
    const match = window.location.href.match(/\/conversation\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Shows a modal to select which conversations to merge
 */
function showMergeSelectionModal(conversations, customerEmail, currentConvId) {
    // Remove existing modal if any
    const existing = document.getElementById('maestro-merge-modal');
    if (existing) existing.remove();

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'maestro-merge-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">
                Merge Conversations
            </h2>
            <button id="maestro-merge-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b;">Ã—</button>
        </div>
        
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
            <div style="font-size: 13px; color: #475569; margin-bottom: 4px;">
                <strong>Customer:</strong> ${customerEmail}
            </div>
            <div style="font-size: 13px; color: #475569;">
                <strong>Merge into:</strong> Conversation #${currentConvId} (current)
            </div>
        </div>
        
        <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">
                Select conversations to merge:
            </div>
            <div id="maestro-merge-list" style="display: flex; flex-direction: column; gap: 8px;">
                ${conversations.map((conv, index) => `
                    <label style="display: flex; align-items: center; padding: 12px; background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.2s;" class="merge-conv-item">
                        <input type="checkbox" value="${conv.id}" style="width: 18px; height: 18px; margin-right: 12px; cursor: pointer;" checked>
                        <div style="flex: 1;">
                            <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 2px;">
                                ${conv.subject}
                            </div>
                            <div style="font-size: 11px; color: #64748b;">
                                Conversation #${conv.id}
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
            <button id="maestro-merge-cancel" style="padding: 10px 20px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; color: #475569;">
                Cancel
            </button>
            <button id="maestro-merge-confirm" style="padding: 10px 20px; background: #f59e0b; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; color: white;">
                Merge Selected
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .merge-conv-item:hover {
            background: #e0f2fe !important;
            border-color: #3b82f6 !important;
        }
    `;
    document.head.appendChild(style);

    // Event listeners
    document.getElementById('maestro-merge-close').onclick = () => overlay.remove();
    document.getElementById('maestro-merge-cancel').onclick = () => overlay.remove();

    document.getElementById('maestro-merge-confirm').onclick = async () => {
        const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);

        if (selectedIds.length === 0) {
            showMergeNotification('Please select at least one conversation to merge', 'warning');
            return;
        }

        overlay.remove();

        // Start merging selected conversations
        await mergeSelectedConversations(selectedIds, currentConvId);
    };
}

/**
 * Automatically merges all conversations from the same customer email
 */
async function autoMergeConversations(customerEmail) {
    if (!customerEmail) {
        showMergeNotification('No customer email found', 'error');
        return;
    }

    const currentConvId = getCurrentConversationId();
    if (!currentConvId) {
        showMergeNotification('Could not determine current conversation', 'error');
        return;
    }

    console.log('MAESTRO_MERGE: Starting auto-merge process...');

    // Show loading state
    const btn = document.getElementById('maestro-merge-threads-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span>ðŸ”„</span> Searching...';
    btn.disabled = true;

    try {
        // Find conversations to merge
        const conversations = await findConversationsToMerge(customerEmail);

        btn.innerHTML = originalContent;
        btn.disabled = false;

        if (conversations.length === 0) {
            showMergeNotification('No other conversations found to merge', 'info');
            return;
        }

        // Show selection modal
        showMergeSelectionModal(conversations, customerEmail, currentConvId);

    } catch (error) {
        console.error('MAESTRO_MERGE: Error during merge process:', error);
        showMergeNotification(`Merge failed: ${error.message}`, 'error');
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

/**
 * Merges the selected conversations
 */
async function mergeSelectedConversations(conversationIds, targetConvId) {
    console.log(`MAESTRO_MERGE: Merging ${conversationIds.length} conversations into ${targetConvId}`);

    showMergeProgress(conversationIds.length, 0);

    let successCount = 0;
    for (let i = 0; i < conversationIds.length; i++) {
        const convId = conversationIds[i];
        console.log(`MAESTRO_MERGE: Merging conversation ${i + 1}/${conversationIds.length}: ${convId}`);

        try {
            await mergeConversationViaUI(convId, targetConvId);
            successCount++;
            showMergeProgress(conversationIds.length, i + 1);

            // Wait a bit between merges
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.error(`MAESTRO_MERGE: Failed to merge conversation ${convId}:`, error);
            showMergeNotification(`Failed to merge conversation ${convId}: ${error.message}`, 'error');
        }
    }

    // Complete
    if (successCount === conversationIds.length) {
        showMergeNotification(`Successfully merged ${successCount} conversation(s)!`, 'success');
        // Reload the page to show updated conversation
        setTimeout(() => window.location.reload(), 2000);
    } else {
        showMergeNotification(`Merged ${successCount} of ${conversationIds.length} conversations`, 'warning');
    }
}


/**
 * Merges a conversation using HelpScout's UI (simulates user clicks)
 * Flow: Click conversation in sidebar â†’ Modal opens â†’ Click "Merge" â†’ Click "Merge" confirmation
 */
async function mergeConversationViaUI(sourceConvId, targetConvId) {
    console.log(`MAESTRO_MERGE: Merging ${sourceConvId} into ${targetConvId} via UI`);

    return new Promise((resolve, reject) => {
        try {
            // Step 1: Find and click the conversation link in the sidebar
            const conversationLink = document.querySelector(`a[href*="/conversation/${sourceConvId}"]`);

            if (!conversationLink) {
                reject(new Error(`Could not find conversation link for ${sourceConvId}`));
                return;
            }

            console.log(`MAESTRO_MERGE: Clicking conversation link for ${sourceConvId}`);
            conversationLink.click();

            // Step 2: Wait for the modal to appear
            setTimeout(() => {
                try {
                    // Find the "Merge" button in the modal footer
                    const mergeButton = document.querySelector('button[data-testid="ConversationModalBody.Merge"]');

                    if (!mergeButton) {
                        reject(new Error('Could not find Merge button in conversation modal'));
                        return;
                    }

                    console.log(`MAESTRO_MERGE: Clicking Merge button in modal`);
                    mergeButton.click();

                    // Step 3: Wait for confirmation dialog and click confirm
                    setTimeout(() => {
                        try {
                            // Find the confirmation "Merge" button
                            const confirmButton = document.querySelector('button.Confirmation_ConfirmButton, button[class*="ConfirmButton"]');

                            if (!confirmButton) {
                                // Try alternative selector
                                const allButtons = document.querySelectorAll('button');
                                let found = false;

                                for (const btn of allButtons) {
                                    if (btn.textContent.trim() === 'Merge' && btn.type === 'button') {
                                        console.log(`MAESTRO_MERGE: Clicking confirmation Merge button`);
                                        btn.click();
                                        found = true;
                                        break;
                                    }
                                }

                                if (!found) {
                                    reject(new Error('Could not find confirmation Merge button'));
                                    return;
                                }
                            } else {
                                console.log(`MAESTRO_MERGE: Clicking confirmation Merge button`);
                                confirmButton.click();
                            }

                            // Step 4: Wait for merge to complete
                            setTimeout(() => {
                                console.log(`MAESTRO_MERGE: Merge completed for ${sourceConvId}`);
                                resolve();
                            }, 1000);

                        } catch (e) {
                            reject(e);
                        }
                    }, 800); // Wait for confirmation dialog

                } catch (e) {
                    reject(e);
                }
            }, 1000); // Wait for modal to open

        } catch (e) {
            reject(e);
        }

        // Timeout safety
        setTimeout(() => {
            reject(new Error('Merge operation timed out'));
        }, 10000);
    });
}

/**
 * Shows a merge progress indicator
 */
function showMergeProgress(total, current) {
    let progressDiv = document.getElementById('maestro-merge-progress');

    if (!progressDiv) {
        progressDiv = document.createElement('div');
        progressDiv.id = 'maestro-merge-progress';
        progressDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ffffff;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 16px 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 250px;
        `;
        document.body.appendChild(progressDiv);
    }

    const percentage = Math.round((current / total) * 100);

    progressDiv.innerHTML = `
        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
            Merging Conversations
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            ${current} of ${total} completed
        </div>
        <div style="background: #f1f5f9; height: 8px; border-radius: 4px; overflow: hidden;">
            <div style="background: #f59e0b; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
        </div>
    `;

    if (current === total) {
        setTimeout(() => {
            if (progressDiv && progressDiv.parentNode) {
                progressDiv.remove();
            }
        }, 2000);
    }
}

/**
 * Shows a merge notification
 */
function showMergeNotification(message, type = 'info') {
    const colors = {
        success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
        error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
        warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
        info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' }
    };

    const color = colors[type] || colors.info;

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color.bg};
        border: 2px solid ${color.border};
        color: ${color.text};
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10001;
        max-width: 300px;
        font-size: 13px;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// --- JIRA LAB COMM SCRAPER ---
const LabCommScraper = {
    async init() {
        const data = await chrome.storage.local.get('pendingLabComm');
        if (!data.pendingLabComm) return;

        const labData = data.pendingLabComm;
        const currentUrl = window.location.href;

        // Only run if we are on the specific Helpscout link provided in Maestro
        if (currentUrl.includes(labData.helpscoutLink.split('?')[0])) {
            console.log("LAB_COMM_SCRAPER: Redirection from Maestro detected. Starting image capture...");
            this.captureAndRedirect(labData);
        }
    },

    async captureAndRedirect(labData) {
        // Wait for the conversation threads to load
        const threads = await this.waitForThreads();
        if (!threads || threads.length === 0) {
            console.error("LAB_COMM_SCRAPER: No threads found to scrape.");
            return;
        }

        const customerPhotos = [];
        // Targeted search for customer threads
        const customerThreads = document.querySelectorAll('.thread-item.is-customer');
        console.log(`LAB_COMM_SCRAPER: Found ${customerThreads.length} customer threads.`);

        customerThreads.forEach(thread => {
            // Find all images within the customer message body
            // We avoid avatars by checking the src and the container
            const images = thread.querySelectorAll('img');
            images.forEach(img => {
                const src = img.src || '';

                // Filtering logic:
                // 1. Skip standard Helpscout avatars
                if (src.includes('/customer-avatar/') || src.includes('avatar')) return;

                // 2. Skip tracking pixels or tiny icons (usually < 50px)
                if (img.naturalWidth > 0 && img.naturalWidth < 50) return;
                if (img.width > 0 && img.width < 50) return;

                const fullLink = img.closest('a')?.href || src;

                // Avoid duplicates
                if (!customerPhotos.find(p => p.url === fullLink)) {
                    customerPhotos.push({
                        url: fullLink,
                        name: img.alt || 'customer-photo.jpg'
                    });
                }
            });
        });

        console.log(`LAB_COMM_SCRAPER: Captured ${customerPhotos.length} customer photos.`);

        // Store photos and redirect to Jira
        labData.customerPhotos = customerPhotos;
        labData.step = 'helpscout_done';

        chrome.storage.local.set({ pendingLabComm: labData }, () => {
            console.log("LAB_COMM_SCRAPER: Image capture complete. Redirecting to Jira...");
            window.location.href = 'https://smyleteam.atlassian.net/jira/for-you';
        });
    },

    async waitForThreads(timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const threads = document.querySelectorAll('li.ThreadListItem');
            if (threads.length > 0) return Array.from(threads);
            await new Promise(r => setTimeout(r, 500));
        }
        return null;
    }
};

// ===========================================
// AI & Macro Sidebar Injection
// ===========================================

// Redundant functions removed for consolidation

// Global debounce timer for observers
let debounceTimer;

// Updated observer to include merge support and consolidated sidebar
const maestroObserver = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        injectSidebarSearchButton();
        injectAiAssistant();
    }, 400);
});

maestroObserver.observe(document.body, { childList: true, subtree: true });

// Initial run after a delay to let the page settle
setTimeout(() => {
    console.log("HELPSCOUT_CONTENT: Initial injection run.");
    showLoadIndicator();
    injectSidebarSearchButton();
    injectAiAssistant();
    if (typeof initSelectionPopup === 'function') initSelectionPopup();

    // Initialize Scraping logic
    if (typeof LabCommScraper !== 'undefined') {
        LabCommScraper.init();
    }

    console.log("MAESTRO: Initial injection complete.");
}, 1000);

