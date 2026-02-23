console.log("MAESTRO_CONTENT: Script injected.");

const SELECTORS = {
    SEARCH_INPUT: '#order-search',
    // Primary target: The "View Details" eye icon button in the first row
    FIRST_RESULT_DETAILS_BTN: 'tbody tr:first-child button[title="View Details"]',
    // Secondary target: The Order ID button in the second column of the first row
    FIRST_RESULT_ORDER_ID_BTN: 'tbody tr:first-child td:nth-child(2) button',

    // --- Customer Page Selectors ---
    CUSTOMER_SEARCH_INPUT: 'input[placeholder*="Search by name"]',
    CUSTOMER_RESULT_LINK: 'tbody tr:first-child a[href^="/customers/"]'
};

async function performAutomation() {
    // Check storage for either order search or customer search
    const data = await chrome.storage.local.get(['pendingMaestroSearch', 'pendingMaestroCustomerSearch']);

    if (data.pendingMaestroSearch) {
        await performOrderSearch(data.pendingMaestroSearch);
    } else if (data.pendingMaestroCustomerSearch) {
        await performCustomerSearch(data.pendingMaestroCustomerSearch);
    }
}

async function performOrderSearch(searchTerm) {
    console.log("MAESTRO_CONTENT: Found pending ORDER search:", searchTerm);

    // 2. Wait for the search input to appear
    // We wait for it initially just to ensure the page has started loading content
    const initialInput = await waitForElement(SELECTORS.SEARCH_INPUT);
    if (!initialInput) {
        console.error("MAESTRO_CONTENT: Initial search input not found.");
        return;
    }

    // Wait a moment for the page to be fully interactive
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture the initial state of the first order ID to detect changes
    const initialOrderIdEl = document.querySelector(SELECTORS.FIRST_RESULT_ORDER_ID_BTN);
    const initialOrderId = initialOrderIdEl ? initialOrderIdEl.textContent.trim() : null;
    console.log("MAESTRO_CONTENT: Initial first order ID:", initialOrderId);

    // 3. Simulate Typing (execCommand Method with Retry)
    const setInputValue = (attempt) => setReactInputValue(SELECTORS.SEARCH_INPUT, searchTerm);

    // Try setting the value up to 10 times (more persistent)
    for (let i = 0; i < 10; i++) {
        await setInputValue(i);
        await new Promise(resolve => setTimeout(resolve, 150)); // Wait for React

        // Check value on the live element
        const checkInput = document.querySelector(SELECTORS.SEARCH_INPUT);
        if (checkInput && checkInput.value === searchTerm) break;

        console.log("MAESTRO_CONTENT: Input value didn't stick, retrying...");
    }

    // 4. Press Enter (Simulate full key press cycle)
    setTimeout(() => {
        const finalInput = document.querySelector(SELECTORS.SEARCH_INPUT);
        if (!finalInput) return;

        const keyEventOptions = {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
            composed: true
        };
        finalInput.dispatchEvent(new KeyboardEvent('keydown', keyEventOptions));
        finalInput.dispatchEvent(new KeyboardEvent('keypress', keyEventOptions));
        finalInput.dispatchEvent(new KeyboardEvent('keyup', keyEventOptions));

        console.log("MAESTRO_CONTENT: Search triggered. Waiting for results to update...");

        // 5. Clear storage
        chrome.storage.local.remove('pendingMaestroSearch');

        // 6. Wait for results to change, then click
        waitForResultsAndClick(initialOrderId);

    }, 500);
}

async function performCustomerSearch(searchTerm) {
    console.log("MAESTRO_CONTENT: Found pending CUSTOMER search:", searchTerm);

    const input = await waitForElement(SELECTORS.CUSTOMER_SEARCH_INPUT);
    if (!input) {
        console.error("MAESTRO_CONTENT: Customer search input not found.");
        return;
    }

    // Wait a moment for interactivity
    await new Promise(resolve => setTimeout(resolve, 500));

    // Attempt to set value
    for (let i = 0; i < 10; i++) {
        await setReactInputValue(SELECTORS.CUSTOMER_SEARCH_INPUT, searchTerm);
        await new Promise(resolve => setTimeout(resolve, 150));

        const checkInput = document.querySelector(SELECTORS.CUSTOMER_SEARCH_INPUT);
        if (checkInput && checkInput.value === searchTerm) break;
    }

    // Press Enter
    setTimeout(() => {
        const finalInput = document.querySelector(SELECTORS.CUSTOMER_SEARCH_INPUT);
        if (finalInput) {
            const keyEventOptions = { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true };
            finalInput.dispatchEvent(new KeyboardEvent('keydown', keyEventOptions));
            finalInput.dispatchEvent(new KeyboardEvent('keypress', keyEventOptions));
            finalInput.dispatchEvent(new KeyboardEvent('keyup', keyEventOptions));
        }

        // Clear storage
        chrome.storage.local.remove('pendingMaestroCustomerSearch');

        // Wait for results and click
        waitForCustomerResultsAndClick();
    }, 500);
}

/**
 * Helper to set value on React inputs
 */
async function setReactInputValue(selector, value) {
    const currentInput = document.querySelector(selector);
    if (!currentInput || currentInput.disabled) return;

    currentInput.focus();
    currentInput.click();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    if (nativeInputValueSetter) {
        nativeInputValueSetter.call(currentInput, value);
    } else {
        currentInput.value = value;
    }

    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
    currentInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitForCustomerResultsAndClick() {
    // Simple polling for the result link since we don't have an initial state to compare against easily
    // and the page might be loading from scratch.
    const checkAndClick = setInterval(() => {
        const link = document.querySelector(SELECTORS.CUSTOMER_RESULT_LINK);
        if (link) {
            console.log("MAESTRO_CONTENT: Found customer result, clicking...");
            clearInterval(checkAndClick);
            link.click();
        }
    }, 500);

    // Stop after 10 seconds
    setTimeout(() => clearInterval(checkAndClick), 10000);
}

/**
 * Waits for the search results table to update before clicking.
 * This is more reliable than a fixed timeout.
 * @param {string | null} initialOrderId - The order ID that was in the first row before searching.
 */
function waitForResultsAndClick(initialOrderId) {
    const tableBody = document.querySelector('tbody');
    if (!tableBody) {
        console.warn("MAESTRO_CONTENT: Table body not found for observing.");
        // Fallback to old method if observer can't be attached
        setTimeout(clickFirstResult, 3000);
        return;
    }

    const observer = new MutationObserver(() => {
        const newFirstRow = document.querySelector('tbody tr:first-child');
        const newOrderIdEl = document.querySelector(SELECTORS.FIRST_RESULT_ORDER_ID_BTN);
        const newOrderId = newOrderIdEl ? newOrderIdEl.textContent.trim() : null;

        // Condition 1: A new row has appeared.
        // Condition 2: The new row is NOT a loading pulse.
        // Condition 3: The new order ID is different from the initial one (or the initial one was null).
        if (newFirstRow && !newFirstRow.classList.contains('animate-pulse-slow') && newOrderId !== initialOrderId) {
            console.log("MAESTRO_CONTENT: Table updated. New first order ID:", newOrderId);
            observer.disconnect();
            // Wait a tiny bit for any final DOM settlement before clicking
            setTimeout(clickFirstResult, 100);
        }
    });

    observer.observe(tableBody, { childList: true, subtree: true, attributes: true });

    // Safety timeout: if nothing happens after 10 seconds, try to click anyway and stop observing.
    setTimeout(() => {
        observer.disconnect();
        console.log("MAESTRO_CONTENT: Observer timed out after 10s. Attempting to click anyway.");
        clickFirstResult();
    }, 10000);
}

function clickFirstResult() {
    const rows = document.querySelectorAll('tbody tr');
    let clicked = false;

    for (const row of rows) {
        // Check Order ID in 2nd column to filter out unwanted types
        const orderIdBtn = row.querySelector('td:nth-child(2) button');
        if (orderIdBtn) {
            const orderIdText = orderIdBtn.textContent.trim().toUpperCase();

            // Skip Stripe orders based on user feedback
            if (orderIdText.includes('STRIPE') || orderIdText.includes('SUB')) {
                console.log("MAESTRO_CONTENT: Skipping Stripe/Sub order row:", orderIdText);
                continue;
            }

            // Found a candidate row. User prefers clicking the name to enter the order context.
            // The name is typically in the 5th column inside an anchor tag.
            const nameLink = row.querySelector('td:nth-child(5) a');
            if (nameLink) {
                console.log("MAESTRO_CONTENT: Clicking Name link for:", orderIdText);
                nameLink.click();
                clicked = true;
                break;
            }

            // Fallback: Click Order ID button if name link is missing
            if (orderIdBtn) {
                console.log("MAESTRO_CONTENT: Name link not found. Clicking Order ID for:", orderIdText);
                orderIdBtn.click();
                clicked = true;
                break;
            }
        }
    }

    if (!clicked) {
        console.warn("MAESTRO_CONTENT: No suitable order found to auto-click (filtered out Stripe/others).");
    }
}

function waitForElement(selector, timeout = 8000) {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) return resolve(document.querySelector(selector));

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

// Run on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performAutomation);
} else {
    performAutomation();
}

// Run when background script triggers it
chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "triggerMaestroSearch") {
        performAutomation();
    } else if (req.action === "EXECUTE_SMART_MAESTRO_SEARCH") {
        console.log("MAESTRO_CONTENT: Received EXECUTE_SMART_MAESTRO_SEARCH", req);
        const { email, name } = req;

        if (window.location.pathname.includes('/orders')) {
            await performOrderSearch(email);
            setTimeout(async () => {
                const results = document.querySelectorAll('tbody tr');
                const hasResults = results.length > 0 && !results[0].innerText.includes('No data');
                if (!hasResults) {
                    console.log("MAESTRO_CONTENT: No results for email, falling back to Name...");
                    chrome.storage.local.set({ 'pendingMaestroCustomerSearch': name }, () => {
                        window.location.href = `https://maestro.smyleteam.com/customers`;
                    });
                }
            }, 5000);
        } else {
            chrome.storage.local.set({ 'pendingMaestroCustomerSearch': name }, () => {
                window.location.href = `https://maestro.smyleteam.com/customers`;
            });
        }
    }
});

// --- JIRA LAB COMM HELPERS ---

/**
 * Extracts the Order ID from the Maestro page header.
 * @returns {string}
 */
function getOrderId() {
    const h1 = document.querySelector('h1.text-lg.font-bold');
    if (h1) {
        // Extract only digits from a string like MST-G-1625494-L or MST-AED-12345
        const match = h1.textContent.match(/\d+/);
        return match ? match[0] : h1.textContent.trim();
    }
    return '00000';
}

/**
 * Creates the Jira Lab Comm button.
 */
function createJiraLabCommButton(name) {
    const btn = document.createElement('button');
    btn.title = `Start Lab Comm for this customer: ${name}`;
    btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        LAB Comm
    `;

    // Jira Blue theme
    btn.style.marginLeft = '8px';
    btn.style.background = '#0052CC';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.padding = '4px 10px';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.height = '28px';
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '500';
    btn.style.transition = 'all 0.2s ease';
    btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';

    btn.onmouseover = () => {
        btn.style.filter = 'brightness(1.1)';
        btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseout = () => {
        btn.style.filter = 'none';
        btn.style.transform = 'translateY(0)';
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const orderId = getOrderId();
        showHelpscoutLinkModal(name, orderId);
    };

    return btn;
}

/**
 * Shows a premium modal to capture the Helpscout conversation link.
 */
function showHelpscoutLinkModal(name, orderId) {
    const modalId = 'maestro-helpscout-modal';
    if (document.getElementById(modalId)) return;

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: 10000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    const modal = document.createElement('div');
    modal.style = `
        background: white; padding: 24px; border-radius: 12px;
        width: 450px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
        animation: modalFadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <style>
            @keyframes modalFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .hs-input { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-top: 12px; font-size: 14px; outline: none; transition: border 0.2s; }
            .hs-input:focus { border-color: #0052CC; box-shadow: 0 0 0 2px rgba(0,82,204,0.1); }
            .hs-btn-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
            .hs-btn { padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
            .hs-btn-primary { background: #0052CC; color: white; border: none; }
            .hs-btn-primary:hover { background: #0747A6; }
            .hs-btn-secondary { background: white; color: #4a5568; border: 1px solid #cbd5e0; }
            .hs-btn-secondary:hover { background: #f7fafc; }
        </style>
        <h3 style="margin: 0 0 8px 0; color: #1a202c; font-size: 18px;">Lab Comm: Helpscout Link</h3>
        <p style="margin: 0; color: #4a5568; font-size: 14px;">Please paste the Helpscout conversation link for <b>${name}</b> (Order #${orderId}) to capture customer photos.</p>
        <input type="text" id="hs-link-input" class="hs-input" placeholder="https://secure.helpscout.net/conversation/..." autofocus>
        <div class="hs-btn-row">
            <button id="hs-cancel" class="hs-btn hs-btn-secondary">Cancel</button>
            <button id="hs-continue" class="hs-btn hs-btn-primary">Capture Photos & Open Jira</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('#hs-link-input');
    const continueBtn = modal.querySelector('#hs-continue');
    const cancelBtn = modal.querySelector('#hs-cancel');

    const closeModal = () => document.body.removeChild(overlay);

    cancelBtn.onclick = closeModal;
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };

    continueBtn.onclick = () => {
        const link = input.value.trim();
        if (!link || !link.includes('helpscout.net')) {
            input.style.borderColor = '#f56565';
            return;
        }

        const data = {
            name: name,
            orderId: orderId,
            helpscoutLink: link,
            timestamp: Date.now()
        };

        console.log("MAESTRO_CONTENT: Starting Lab Comm flow with:", data);

        chrome.storage.local.set({ pendingLabComm: data }, () => {
            closeModal();
            // Open Helpscout in a NEW tab to scrape images
            window.open(link, '_blank');
        });
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') continueBtn.click();
        if (e.key === 'Escape') closeModal();
    };
}

// --- UI ENHANCEMENTS ---

/**
 * Creates a standardized ShipStation search button.
 * @param {string} name - The customer name to search for.
 * @returns {HTMLButtonElement} The configured button element.
 */
function createShipStationButton(name) {
    const btn = document.createElement('button');
    btn.title = `Copy Name & Search in ShipStation for: ${name}`;
    btn.className = "maestro-shipstation-search-btn";
    // ShipStation Icon (Green)
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: black;">
            <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.6 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.6 1 .6.5 1.2 1 2.5 1"></path>
            <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.9 5.8 2.8 8"></path>
            <path d="M12 10V4"></path><path d="M8 8l4-4 4 4"></path>
        </svg>
    `;

    // Styles to match the clean UI but "pop" more
    btn.style.marginLeft = '8px';
    btn.style.background = '#10b981';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '4px 8px';
    btn.style.borderRadius = '6px';
    btn.style.transition = 'all 0.2s ease';
    btn.style.height = '28px';

    // Hover effects
    btn.onmouseover = () => {
        btn.style.filter = 'brightness(1.1)';
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    };
    btn.onmouseout = () => {
        btn.style.filter = 'none';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    };

    // Click Handler
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (name) {
            console.log("MAESTRO_CONTENT: Copying and searching ShipStation for:", name);
            navigator.clipboard.writeText(name).catch(err => console.error("Clipboard error:", err));
            chrome.runtime.sendMessage({ action: "searchShipStation", searchTerm: name });
        }
    };

    return btn;
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
 * Creates a small, subtle copy button.
 * @param {string} textToCopy - The text that the button will copy.
 * @returns {HTMLButtonElement} The configured button element.
 */
function createCopyButton(textToCopy) {
    const btn = document.createElement('button');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    btn.title = `Copy: ${textToCopy}`;
    btn.className = 'maestro-copy-btn';

    // Styling
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.marginLeft = '8px';
    btn.style.padding = '2px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.color = '#9ca3af'; // Tailwind gray-400
    btn.style.transition = 'color 0.2s, transform 0.1s';

    btn.onmouseover = () => btn.style.color = '#374151'; // Tailwind gray-700
    btn.onmouseout = () => {
        if (!btn.classList.contains('copied')) {
            btn.style.color = '#9ca3af';
        }
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Show tooltip at cursor position
            showCopiedTooltip(e.clientX, e.clientY);

            btn.classList.add('copied');
            btn.style.color = '#10b981'; // Tailwind emerald-500
            btn.style.transform = 'scale(1.1)';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.style.color = '#9ca3af';
                btn.style.transform = 'scale(1)';
            }, 1500);
        }).catch(err => console.error("MAESTRO_CONTENT: Copy failed:", err));
    };

    return btn;
}

/**
 * Creates a button to copy just the first name.
 * @param {string} firstName 
 * @returns {HTMLButtonElement}
 */
function createFirstNameCopyButton(firstName) {
    const btn = document.createElement('button');
    // User icon to denote "Person Name"
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    btn.title = `Copy First Name: ${firstName}`;
    btn.className = 'maestro-firstname-copy-btn';

    // Styling - Special Purple Color
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.marginLeft = '6px';
    btn.style.padding = '2px';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.color = '#8b5cf6';
    btn.style.transition = 'color 0.2s, transform 0.1s';

    btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(firstName).then(() => {
            showCopiedTooltip(e.clientX, e.clientY);
            btn.style.color = '#10b981'; // Green
            setTimeout(() => {
                btn.style.color = '#8b5cf6';
            }, 1500);
        }).catch(err => console.error("MAESTRO_CONTENT: Copy failed:", err));
    };

    return btn;
}

/**
 * Injects a ShipStation search button on the Customer Case Page header.
 * Target: <a href="/customers/...">Customer Name</a>
 */
function injectHeaderShipStationButton() {
    const customerLinks = document.querySelectorAll('a[href^="/customers/"]');

    customerLinks.forEach(link => {
        if (link.dataset.shipstationBtn) return;
        link.dataset.shipstationBtn = "true";

        const name = link.textContent.trim();
        if (!name || !link.parentNode) return;

        const ssBtn = createShipStationButton(name);

        // Only inject Jira button if it's in the page header (near Order ID)
        // or if it's not in a card.
        const isInHeader = !!link.closest('.flex.flex-wrap.items-center')?.querySelector('h1') ||
            !!link.closest('.flex.items-center.gap-2')?.querySelector('h1');

        const jiraBtn = isInHeader ? createJiraLabCommButton(name) : null;

        // If the parent is a flex row with justify-between, it's the info card.
        // We need to wrap the link and buttons to keep them together.
        if (link.parentNode.classList.contains('justify-between')) {
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';

            // Replace the link with the wrapper
            link.parentNode.replaceChild(wrapper, link);

            // Add the link and buttons to the wrapper
            wrapper.appendChild(link);
            wrapper.appendChild(ssBtn);
            if (jiraBtn) wrapper.appendChild(jiraBtn);
        } else {
            // Original behavior for other layouts (e.g., page header)
            if (jiraBtn) {
                link.parentNode.insertBefore(jiraBtn, link.nextSibling);
                link.parentNode.insertBefore(ssBtn, jiraBtn);
            } else {
                link.parentNode.insertBefore(ssBtn, link.nextSibling);
            }
        }
    });
}

/**
 * Injects ShipStation search buttons into the orders table.
 * Target: tbody tr td:nth-child(5) a
 */
function injectTableShipStationButtons() {
    // This selector is based on the `clickFirstResult` function logic
    const nameLinks = document.querySelectorAll('tbody tr td:nth-child(5) a');

    nameLinks.forEach(link => {
        // Prevent duplicate injection
        if (link.dataset.shipstationBtn) return;
        link.dataset.shipstationBtn = "true";

        const name = link.textContent.trim();
        if (name && link.parentNode) {
            const btn = createShipStationButton(name);
            // Insert inside the same parent as the link
            link.parentNode.appendChild(btn);
        }
    });
}

/**
 * Injects a ShipStation search button on the Customer Profile Page.
 * Targets the primary action area (next to Edit/Email).
 */
function injectProfileHeaderButtons() {
    // 1. Find the "Back" button to locate the header area
    const backBtn = Array.from(document.querySelectorAll('button'))
        .find(b => b.innerText.includes('Back to Customers') || b.innerText.includes('Back to Cases'));
    if (!backBtn) return;

    // 2. Find the header grid or flex container
    const headerArea = backBtn.closest('.sticky') || backBtn.closest('.px-3.sm\\/px-6.py-3.sm\\/py-4') || backBtn.closest('.flex.flex-col.sm\\:flex-row');
    if (!headerArea) return;

    // 3. Find the Name
    const nameHeader = headerArea.querySelector('h1');
    if (!nameHeader || nameHeader.dataset.maestroProcessed) return;
    const name = nameHeader.innerText.trim();
    nameHeader.dataset.maestroProcessed = "true";

    // 4. Find the Action Container (The one with "Edit Customer")
    const actionContainer = Array.from(headerArea.querySelectorAll('.flex.items-center.gap-2.flex-wrap, .flex.gap-2.flex-wrap'))
        .find(el => el.innerText.includes('Edit') || el.innerText.includes('Email')) || headerArea.querySelector('.flex.justify-between')?.nextElementSibling;

    if (!actionContainer) {
        console.warn("MAESTRO: Action container not found in header area.");
        return;
    }

    console.log("MAESTRO: Injecting buttons for:", name);

    // --- BUTTON 1: ShipStation Search ---
    const ssBtn = createShipStationButton(name);
    actionContainer.insertBefore(ssBtn, actionContainer.firstChild);

    // --- BUTTON 2: Source Website Search ---
    const sourceBtn = createSourceButton();
    actionContainer.insertBefore(sourceBtn, ssBtn.nextSibling);

    // --- BUTTON 3: Copy Order Number (Digits Only) ---
    const copyOrderBtn = createCopyOrderNumberButton();
    actionContainer.appendChild(copyOrderBtn);

    // --- BUTTON 4: Copy Full Name (Placed next to name) ---
    const copyNameBtn = createFullNameCopyButton(name);
    nameHeader.parentNode.style.display = 'flex';
    nameHeader.parentNode.style.alignItems = 'center';
    nameHeader.parentNode.style.gap = '8px';
    nameHeader.parentNode.insertBefore(copyNameBtn, nameHeader.nextSibling);
}

/**
 * Creates a button to copy the full name with a specific icon.
 */
function createFullNameCopyButton(name) {
    const btn = document.createElement('button');
    btn.title = `Copy Full Name: ${name}`;
    btn.className = 'maestro-fullname-copy-btn';

    // User / ID Card icon
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1;">
           <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/>
        </svg>
    `;

    // Styling
    btn.style.background = '#ffffff';
    btn.style.border = '1px solid #e2e8f0';
    btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '4px 8px';
    btn.style.borderRadius = '6px';
    btn.style.transition = 'all 0.2s ease';
    btn.style.height = '28px';

    btn.onmouseover = () => {
        btn.style.backgroundColor = '#f5f3ff';
        btn.style.borderColor = '#c4b5fd';
        btn.style.transform = 'translateY(-1px)';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = '#ffffff';
        btn.style.borderColor = '#e2e8f0';
        btn.style.transform = 'translateY(0)';
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(name).then(() => {
            showCopiedTooltip(e.clientX, e.clientY);
        });
    };

    return btn;
}

/**
 * Scans the page for tracking numbers with specific labels.
 */
function detectTrackingNumbers() {
    const findings = [];

    // 1. Seek "Outbound to Customer"
    const outboundH4 = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Outbound to Customer'));
    if (outboundH4) {
        const container = outboundH4.closest('.border.rounded-lg') || outboundH4.parentElement.parentElement;
        const trackLink = container?.querySelector('a[href*="TrackConfirmAction"]');
        if (trackLink) {
            findings.push({ type: 'Outbound', number: trackLink.innerText.trim(), source: 'Maestro-DOM' });
        }
    }

    // 2. Seek "Return to Lab"
    const returnH4 = Array.from(document.querySelectorAll('h4')).find(h => h.innerText.includes('Return to Lab'));
    if (returnH4) {
        const container = returnH4.closest('.border.rounded-lg') || returnH4.parentElement.parentElement;
        const trackLink = container?.querySelector('a[href*="TrackConfirmAction"]');
        if (trackLink) {
            findings.push({ type: 'Return', number: trackLink.innerText.trim(), source: 'Maestro-DOM' });
        }
    }

    // 3. Handle the "Shipments" section provided by user
    // The user provided: <div class="font-semibold tracking-tight text-base">Impression Kit</div>
    const shipmentCards = document.querySelectorAll('.rounded-xl.border.bg-card');
    shipmentCards.forEach(card => {
        const titleEl = card.querySelector('.font-semibold.tracking-tight.text-base');
        const cardTitle = titleEl ? titleEl.textContent.trim() : 'Shipment';

        // Find all tracking links/codes in this card
        const trkLinks = card.querySelectorAll('a[href*="TrackConfirmAction"], code.bg-white');
        trkLinks.forEach(link => {
            const trkNum = link.textContent.trim();
            if (trkNum && !findings.some(f => f.number === trkNum)) {
                // Determine direction based on neighbor headers
                const sectionHeader = link.closest('.border.rounded-lg')?.querySelector('h4')?.textContent || '';
                let type = cardTitle;
                if (sectionHeader.includes('Return')) type += ' (Return)';
                else if (sectionHeader.includes('Outbound')) type += ' (Outbound)';

                findings.push({ type: type, number: trkNum, source: 'Maestro-Shipping' });
            }
        });
    });

    // 4. Fallback: Generic Scanning
    const textNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walk.nextNode()) textNodes.push(node);

    textNodes.forEach(node => {
        const parentText = node.parentNode ? node.parentNode.innerText : "";

        // Tracking Regex
        const uspsRegex = /\b(9[42]\d{18,20})\b/;
        const upsRegex = /\b(1Z[A-Z0-9]{16})\b/;

        const findTracking = (str) => {
            const m = str.match(uspsRegex) || str.match(upsRegex);
            return m ? m[0] : null;
        };

        if (/Impression|Kit|Track/i.test(parentText)) {
            const trk = findTracking(parentText);
            if (trk && !findings.some(f => f.number === trk)) {
                findings.push({ type: 'Kit/Order', number: trk, source: 'Maestro-Scan' });
            }
        }
    });

    // --- CACHE RESULTS BY EMAIL ---
    try {
        const email = getCustomerEmailFromProfile();
        if (email && findings.length > 0) {
            console.log(`MAESTRO_CONTENT: Caching ${findings.length} findings for ${email}`);
            chrome.storage.local.get('trackingCache', (data) => {
                const cache = data.trackingCache || {};
                cache[email.toLowerCase()] = {
                    tracking: findings,
                    timestamp: Date.now()
                };
                chrome.storage.local.set({ trackingCache: cache });
            });
        }
    } catch (e) {
        console.warn("MAESTRO_CONTENT: Failed to cache tracking:", e);
    }

    return findings;
}

function getCustomerEmailFromProfile() {
    // Search for any element containing an email address pattern
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const bodyText = document.body.innerText;
    const match = bodyText.match(emailRegex);
    if (match) return match[0].trim();

    // Secondary: look for common profile labels
    const labels = Array.from(document.querySelectorAll('dt, span, label'));
    const emailLabel = labels.find(l => /email/i.test(l.textContent));
    if (emailLabel && emailLabel.nextElementSibling) {
        const email = emailLabel.nextElementSibling.textContent.trim();
        if (email.includes('@')) return email;
    }

    return null;
}

/**
 * Injects a separate div for detected tracking numbers.
 */
function injectTrackingButtonsDiv() {
    const nameHeader = document.querySelector('h1');
    if (!nameHeader) return;

    const headerArea = nameHeader.closest('.sticky') || nameHeader.closest('.px-3.sm\/px-6.py-3.sm\/py-4');
    if (!headerArea || headerArea.querySelector('#maestro-tracking-container')) return;

    const findings = detectTrackingNumbers();
    if (findings.length === 0) return;

    const container = document.createElement('div');
    container.id = 'maestro-tracking-container';
    container.style.cssText = `
        display: flex;
        gap: 10px;
        margin-top: 12px;
        padding: 8px 12px;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        align-items: center;
        flex-wrap: wrap;
        width: 100%;
    `;

    const label = document.createElement('span');
    label.textContent = "Detected Tracking:";
    label.style.cssText = "font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-right: 5px;";
    container.appendChild(label);

    findings.forEach(item => {
        const btn = document.createElement('button');
        btn.className = "maestro-tracking-btn";

        // Color based on type
        const isReturn = item.type.includes('Return');
        const color = isReturn ? '#16a34a' : '#2563eb';
        const bg = isReturn ? '#f0fdf4' : '#eff6ff';
        const border = isReturn ? '#bcf0da' : '#dbeafe';

        btn.innerHTML = `
            <span style="font-weight: 600; color: #1e293b;">${item.type}:</span>
            <span style="color: ${color}; text-decoration: underline; margin-left: 4px;">${item.number}</span>
        `;

        btn.style.cssText = `
            background: ${bg};
            border: 1px solid ${border};
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: all 0.2s;
            display: flex;
            align-items: center;
        `;

        btn.onmouseover = () => {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        };

        btn.onclick = () => {
            const url = `https://tools.usps.com/go/TrackConfirmAction.action?tLabels=${item.number}`;
            window.open(url, '_blank');
        };

        container.appendChild(btn);
    });

    headerArea.appendChild(container);
}

/**
 * Scans the page for an order number (WC-, WC-S-, SHINYSMILE-) to determine the source URL.
 */
function getOrderNumberFromPage() {
    // Use XPath to efficiently find text nodes containing our prefixes
    const xpath = "//*[contains(text(), 'WC-') or contains(text(), 'SHINYSMILE-')]";
    const result = document.evaluate(xpath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < result.snapshotLength; i++) {
        const el = result.snapshotItem(i);
        const text = el.textContent;

        // Check specific patterns
        const giddyUp = text.match(/SHINYSMILE-\d+/);
        if (giddyUp) return giddyUp[0];

        const wcSub = text.match(/WC-S-\d+/);
        if (wcSub) return wcSub[0];

        const wc = text.match(/WC-\d+/);
        if (wc) return wc[0];
    }
    return null;
}

/**
 * Creates the "Main Order Website Page" button.
 */
function createSourceButton() {
    const btn = document.createElement('button');
    btn.title = "Open Main Order Website Page";
    btn.className = "maestro-source-btn";
    // Globe Icon
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
    `;

    // Styling
    btn.style.marginLeft = '8px';
    btn.style.background = '#ffffff';
    btn.style.border = '1px solid #e2e8f0';
    btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '4px 8px';
    btn.style.borderRadius = '6px';
    btn.style.transition = 'all 0.2s ease';
    btn.style.height = '28px';

    // Hover
    btn.onmouseover = () => {
        btn.style.backgroundColor = '#eff6ff'; // Blue tint
        btn.style.borderColor = '#93c5fd';
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = '#ffffff';
        btn.style.borderColor = '#e2e8f0';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const orderNumber = getOrderNumberFromPage();

        if (!orderNumber) {
            alert("Could not detect a supported order number (WC-, WC-S-, SHINYSMILE-) on this page.");
            return;
        }

        let url = '';
        if (orderNumber.startsWith('WC-S-')) {
            const id = orderNumber.replace('WC-S-', '');
            url = `https://shop.shinysmileveneers.com/wp-admin/post.php?post=${id}&action=edit`;
        } else if (orderNumber.startsWith('SHINYSMILE-')) {
            url = `https://partner.giddyup.io/1420/orders/${orderNumber}`;
        } else if (orderNumber.startsWith('WC-')) {
            url = `https://shop.shinysmileveneers.com/wp-admin/edit.php?s=${orderNumber}&post_status=all&post_type=shop_order`;
        }

        if (url) {
            window.open(url, '_blank');
        }
    };

    return btn;
}

/**
 * Creates the "Copy Order Number" button (Digits Only).
 */
function createCopyOrderNumberButton() {
    const btn = document.createElement('button');
    btn.title = "Copy Order Number (Digits Only)";
    btn.className = "maestro-copy-order-btn";

    // Hash Icon + Text
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1;">
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="8" y2="21"></line>
            <line x1="16" y1="3" x2="14" y2="21"></line>
        </svg>
        <span style="margin-left: 4px; font-size: 11px; font-weight: 600; color: #475569;">Copy #</span>
    `;

    // Styling
    btn.style.marginLeft = '8px';
    btn.style.background = '#ffffff';
    btn.style.border = '1px solid #e2e8f0';
    btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    btn.style.cursor = 'pointer';
    btn.style.display = 'inline-flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.padding = '4px 8px';
    btn.style.borderRadius = '6px';
    btn.style.transition = 'all 0.2s ease';
    btn.style.height = '28px';

    // Hover
    btn.onmouseover = () => {
        btn.style.backgroundColor = '#f5f3ff';
        btn.style.borderColor = '#c4b5fd';
        btn.style.transform = 'translateY(-1px)';
        btn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';

        const orderNumber = getOrderNumberFromPage();
        if (orderNumber) {
            const digits = orderNumber.replace(/\D/g, '');
            if (digits) {
                btn.title = `Copy: ${digits}`;
            }
        }
    };
    btn.onmouseout = () => {
        btn.style.backgroundColor = '#ffffff';
        btn.style.borderColor = '#e2e8f0';
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    };

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const orderNumber = getOrderNumberFromPage();

        if (orderNumber) {
            const digits = orderNumber.replace(/\D/g, '');
            if (digits) {
                navigator.clipboard.writeText(digits).then(() => {
                    showCopiedTooltip(e.clientX, e.clientY);
                });
            } else {
                alert("No digits found in order number.");
            }
        } else {
            alert("Order number not found.");
        }
    };

    return btn;
}

// This function is now combined into injectProfileHeaderButtons

/**
 * Injects copy buttons into the customer information card.
 */
function injectInfoCardCopyButtons() {
    // Target rows in the customer info card by first finding its unique header.
    const cardHeader = Array.from(document.querySelectorAll('.font-semibold.leading-none.tracking-tight'))
        .find(h => h.textContent.includes('Customer Information'));

    if (!cardHeader) return;

    const card = cardHeader.closest('.rounded-xl.border');
    if (!card) return;

    const infoRows = card.querySelectorAll('.p-6.pt-0 > .flex.items-center.justify-between');

    infoRows.forEach(row => {
        // Identify if this is the "Name" row
        const label = row.querySelector('span');
        const isNameRow = label && label.textContent.trim() === 'Name';

        if (row.dataset.copyBtnAdded) {
            // If generic copy button is present, ensure First Name button is added for Name row
            if (isNameRow && !row.dataset.firstNameBtnAdded) {
                const wrapper = row.querySelector('div[style*="display: flex"]');
                if (wrapper) {
                    const valueEl = wrapper.querySelector('a, p');
                    if (valueEl) {
                        const fullName = valueEl.textContent.trim();
                        const firstName = fullName.split(' ')[0];
                        if (firstName) {
                            const fnBtn = createFirstNameCopyButton(firstName);
                            wrapper.appendChild(fnBtn);
                            row.dataset.firstNameBtnAdded = 'true';
                        }
                    }
                }
            }
            return;
        }

        const valueEl = row.querySelector('a[href^="/customers/"], p.font-medium');
        if (!valueEl) return;

        const valueText = valueEl.textContent.trim();
        if (!valueText) return;

        row.dataset.copyBtnAdded = 'true';
        const copyBtn = createCopyButton(valueText);

        // The value element's parent might already be a wrapper (for Name).
        // If so, append the copy button there. Otherwise, create a new wrapper.
        let targetWrapper = (valueEl.parentNode.style.display === 'flex') ? valueEl.parentNode : null;

        if (targetWrapper) {
            targetWrapper.appendChild(copyBtn);
        } else {
            const newWrapper = document.createElement('div');
            newWrapper.style.display = 'flex';
            newWrapper.style.alignItems = 'center';

            // Handle text alignment for address field
            if (valueEl.classList.contains('text-right')) {
                newWrapper.style.justifyContent = 'flex-end';
                newWrapper.classList.add('text-right', 'max-w-[200px]'); // copy classes
            }

            row.replaceChild(newWrapper, valueEl);
            newWrapper.appendChild(valueEl);
            newWrapper.appendChild(copyBtn);
            targetWrapper = newWrapper;
        }

        // Inject First Name Button if it's the Name row
        if (isNameRow) {
            const firstName = valueText.split(' ')[0];
            if (firstName) {
                const fnBtn = createFirstNameCopyButton(firstName);
                targetWrapper.appendChild(fnBtn);
                row.dataset.firstNameBtnAdded = 'true';
            }
        }
    });
}

/**
 * Injects copy buttons into the customer profile page (new layout).
 */
function injectCustomerProfilePageButtons() {
    const cards = document.querySelectorAll('.rounded-xl.border.bg-card');

    cards.forEach(card => {
        // Identify the customer info card by looking for specific icons
        const mailIcon = card.querySelector('.lucide-mail');
        const mapPinIcon = card.querySelector('.lucide-map-pin');

        if (!mailIcon || !mapPinIcon) return;

        // --- NAME ---
        // Target the name in the header
        const nameEl = card.querySelector('.font-semibold.leading-none.tracking-tight .font-semibold');
        // Ensure we target the name div, not the container
        if (nameEl && !nameEl.dataset.copyBtnAdded) {
            const name = nameEl.textContent.trim();
            if (name) {
                nameEl.dataset.copyBtnAdded = 'true';

                const headerRow = nameEl.closest('.font-semibold.leading-none.tracking-tight');
                if (headerRow) {
                    const copyBtn = createCopyButton(name);
                    // Far right placement
                    copyBtn.style.marginLeft = 'auto';

                    headerRow.appendChild(copyBtn);
                }
            }
        }

        // --- EMAIL ---
        const emailRow = mailIcon.closest('.flex.items-center');
        if (emailRow && !emailRow.dataset.copyBtnAdded) {
            const emailText = emailRow.textContent.trim();
            if (emailText) {
                emailRow.dataset.copyBtnAdded = 'true';
                const copyBtn = createCopyButton(emailText);
                copyBtn.style.marginLeft = 'auto';

                emailRow.appendChild(copyBtn);
            }
        }

        // --- ADDRESS ---
        const addressRow = mapPinIcon.closest('.flex.items-start');
        if (addressRow && !addressRow.dataset.copyBtnAdded) {
            const addressContainer = addressRow.querySelector('div');
            if (addressContainer) {
                // Extract address lines, skipping the label (first child usually has font-medium)
                const lines = [];
                Array.from(addressContainer.children).forEach(child => {
                    // Skip the label like "shipping (Default)"
                    if (!child.classList.contains('font-medium')) {
                        lines.push(child.textContent.trim());
                    }
                });
                // If no lines found (unexpected structure), fallback to full text
                const addressText = lines.length > 0 ? lines.join('\n') : addressContainer.innerText.trim();

                if (addressText) {
                    addressRow.dataset.copyBtnAdded = 'true';
                    const copyBtn = createCopyButton(addressText);
                    copyBtn.style.marginLeft = 'auto';
                    copyBtn.style.marginTop = '2px'; // Align with top line

                    addressRow.appendChild(copyBtn);
                }
            }
        }
    });
}

/**
 * Attaches a paste event listener to the main search input to clean phone numbers.
 */
function attachPasteListener() {
    const searchInput = document.querySelector(SELECTORS.SEARCH_INPUT);
    if (searchInput && !searchInput.dataset.pasteListenerAttached) {
        searchInput.dataset.pasteListenerAttached = 'true';
        searchInput.addEventListener('paste', (event) => {
            // Get the text from the clipboard
            const pastedText = (event.clipboardData || window.clipboardData).getData('text');

            // Smart Detection:
            // 1. Ignore if it contains letters (e.g., emails, names, alphanumeric IDs).
            if (/[a-zA-Z]/.test(pastedText)) return;

            // 2. Ignore if it has fewer than 7 digits (likely not a phone number).
            const digitCount = (pastedText.match(/\d/g) || []).length;
            if (digitCount < 7) return;

            // Clean the text: remove all non-digit characters
            const cleanedText = pastedText.replace(/\D/g, '');

            // If the cleaning resulted in a change (i.e., it was a formatted number), handle it
            if (pastedText !== cleanedText) {
                // Prevent the default paste action
                event.preventDefault();

                // Set the cleaned text as the input's value using a React-safe method
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(searchInput, cleanedText);
                } else {
                    searchInput.value = cleanedText;
                }

                // Dispatch events to trigger React change listeners
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                searchInput.dispatchEvent(new Event('change', { bubbles: true }));

                console.log(`MAESTRO_CONTENT: Pasted and cleaned "${pastedText}" to "${cleanedText}"`);
            }
        });
    }
}

// Observer to handle dynamic page changes (SPA navigation)
const maestroUiObserver = new MutationObserver(() => {
    // This will now run all injection functions on any DOM change
    injectHeaderShipStationButton();
    injectTableShipStationButtons();
    injectProfileHeaderButtons();
    injectInfoCardCopyButtons();
    injectCustomerProfilePageButtons();
    injectTrackingButtonsDiv();
    attachPasteListener();
});

/* 

*/

//

// Start observing
if (document.body) {
    maestroUiObserver.observe(document.body, { childList: true, subtree: true });
    // Initial run
    injectHeaderShipStationButton();
    injectTableShipStationButtons();
    injectProfileHeaderButtons();
    injectInfoCardCopyButtons();
    injectCustomerProfilePageButtons();
    injectTrackingButtonsDiv();
    attachPasteListener();
    initSelectionPopup();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        maestroUiObserver.observe(document.body, { childList: true, subtree: true });
        // Initial run
        injectHeaderShipStationButton();
        injectTableShipStationButtons();
        injectProfileHeaderButtons();
        injectInfoCardCopyButtons();
        injectCustomerProfilePageButtons();
        injectTrackingButtonsDiv();
        attachPasteListener();
        initSelectionPopup();
        initDarkMode();
    });
}

// --- SELECTION SEARCH POPUP ---

function initSelectionPopup() {
    // 1. Create the popup element if it doesn't exist
    let popup = document.getElementById('maestro-selection-popup');
    if (popup) return; // Already initialized

    popup = document.createElement('div');
    popup.id = 'maestro-selection-popup';
    popup.style.cssText = `
        position: absolute;
        background-color: #2c3e50;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        padding: 5px;
        display: none;
        flex-direction: row;
        gap: 5px;
        transition: opacity 0.1s ease-in-out;
    `;
    // Prevent clicks inside the popup from hiding it immediately
    popup.addEventListener('mousedown', e => e.stopPropagation());
    document.body.appendChild(popup);

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
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v4h-8v-8Z"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>`,
            action: 'searchShipStation'
        },
        {
            id: 'stripe',
            title: 'Search Stripe',
            icon: `<svg fill="#fff" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px;"><path d="M13.706 9.663c0-1.394 1.162-1.931 3.025-1.931 2.713 0 6.156 0.831 8.869 2.294v-8.393c-2.956-1.181-5.906-1.631-8.863-1.631-7.231 0-12.050 3.775-12.050 10.087 0 9.869 13.55 8.269 13.55 12.525 0 1.65-1.431 2.181-3.419 2.181-2.95 0-6.763-1.219-9.756-2.844v8.031c3.079 1.329 6.396 2.017 9.75 2.025 7.413 0 12.519-3.188 12.519-9.6 0-10.637-13.625-8.731-13.625-12.744z"></path></svg>`,
            action: 'searchStripe'
        },
        {
            id: 'helpscout',
            title: 'Search HelpScout',
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16"/><path d="M20 4v16"/><path d="M4 12h16"/></svg>`,
            customAction: (searchTerm) => {
                window.open(`https://secure.helpscout.net/search/?query=${encodeURIComponent(searchTerm)}`, '_blank');
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
        btn.onmouseover = () => btn.style.backgroundColor = 'rgba(255,255,255,0.1)';
        btn.onmouseout = () => btn.style.backgroundColor = 'transparent';

        btn.addEventListener('click', () => {
            console.log(`MAESTRO_CONTENT: Selection search for ${b.id} (${searchType}): "${text}"`);
            if (b.customAction) {
                b.customAction(text);
            } else {
                chrome.runtime.sendMessage({
                    action: b.action,
                    searchTerm: text,
                    openInBackground: true
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

// --- NEW: CROSS-TAB MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_CRM_SEARCH') {
        console.log('MAESTRO_CONTENT: Received cross-tab search request for:', request.query);
        const searchInput = document.querySelector('#order-search') || document.querySelector('input[placeholder*="Search by name"]');
        if (searchInput) {
            // Set value
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(searchInput, request.query);

            // Dispatch Events to trigger React state changes
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Hit enter if it's within a form or trigger a click on search button if available
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            searchInput.dispatchEvent(enterEvent);
        }
    }
});
