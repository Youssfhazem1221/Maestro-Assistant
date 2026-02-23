console.log("Maestro: ShipStation Content Script Loaded");

function performShipStationSearch(searchTerm) {
    // Common selectors for ShipStation's search bar
    // We try a few variations to be safe
    const selectors = [
        'input[name="searchTerm"]', // From user-provided HTML, very stable.
        'input[placeholder="Search Orders..."]', // From user-provided HTML.
        'input[placeholder="Search Orders"]',
        'input[aria-label="Quick Search"]',
        'input#quick-search-input'
    ];

    let searchInput = null;
    for (const selector of selectors) {
        searchInput = document.querySelector(selector);
        if (searchInput) break;
    }

    if (!searchInput) {
        console.error("Maestro: Search input not found.");
        return false;
    }

    console.log("Maestro: Setting search term:", searchTerm);

    // 1. Focus the input
    searchInput.focus();
    searchInput.click();

    // 2. Set Value (React/Angular safe)
    // This ensures the underlying framework detects the change
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    if (nativeInputValueSetter) {
        nativeInputValueSetter.call(searchInput, searchTerm);
    } else {
        searchInput.value = searchTerm;
    }

    // 3. Dispatch Events to simulate typing
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

    // 4. Press Enter to trigger search
    setTimeout(() => {
        // Method 1: Press Enter (Primary)
        searchInput.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true,
            cancelable: true
        }));

        // Method 2: Click search button (Fallback)
        // The search button is a sibling of the input inside a wrapper.
        const searchButton = searchInput.parentElement.querySelector('button[class*="search-button"]');
        if (searchButton) {
            searchButton.click();
        }
    }, 100);

    return true;
}

// Listen for the command from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "performShipStationSearch") {
        const success = performShipStationSearch(request.searchTerm);
        if (success) {
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "Input not found" });
        }
        return true; // Keep message channel open.
    }
});

// --- UI ENHANCEMENTS FOR GRID ---

function injectGridButtons() {
    // Debug log to confirm function is running (shows in Console)
    // console.log("Maestro: Scanning for grid rows...");

    // 1. Find all Recipient Cells
    // We target ANY element with data-column="recipient" OR the class name as fallback
    const recipientCells = document.querySelectorAll('[data-column="recipient"], .recipient-column-dkx6Qmj');

    if (recipientCells.length > 0) {
        // console.log(`Maestro: Found ${recipientCells.length} recipient cells.`);
    }

    recipientCells.forEach(cell => {
        // Prevent duplicate injection
        if (cell.querySelector('.maestro-ss-actions')) return;

        // SKIP Header cells: They might have the attribute but we don't want buttons in the header
        if (cell.closest('[role="columnheader"]')) return;
        // Also skip if it contains "Recipient" text directly as its only content (likely a header)
        if (cell.textContent.trim() === "Recipient") return;

        const wrapper = document.createElement('div');
        wrapper.className = 'maestro-ss-actions';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '6px';
        wrapper.style.marginTop = '4px';
        wrapper.style.zIndex = '999'; // Ensure it sits on top

        // Helper to create buttons
        const createBtn = (text, color, type) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            btn.title = type === 'shipment' ? "Open Shipment Tracking" : "Open Return Tracking";
            btn.style.backgroundColor = color;
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '3px';
            btn.style.padding = '3px 8px';
            btn.style.fontSize = '11px';
            btn.style.cursor = 'pointer';
            btn.style.fontWeight = '600';
            btn.style.lineHeight = '1';

            // Prevent row selection on click
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGridButtonClick(e, cell, type);
            };
            return btn;
        };

        wrapper.appendChild(createBtn('Ship #', '#2ecc71', 'shipment')); // Green
        wrapper.appendChild(createBtn('Ret #', '#e74c3c', 'return'));   // Red

        // Insert inside the cell
        // 1. Try to append to the inner wrapper for better layout
        const innerWrapper = cell.querySelector('div[class*="recipient-column"]') || cell.querySelector('.recipient-name-bWdCwCb')?.parentNode;

        if (innerWrapper) {
            innerWrapper.appendChild(wrapper);
        } else {
            // 2. Fallback: Append directly to cell
            cell.appendChild(wrapper);
        }
    });
}

async function handleGridButtonClick(e, cell, type) {
    const btn = e.target;
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    try {
        console.log("Maestro: Button clicked", type);

        // 1. Find the Row ID to locate the Order Number cell
        // Strategy: Check cell attribute -> Check parent row attribute
        let rowId = cell.getAttribute('data-row-id');

        if (!rowId) {
            const row = cell.closest('[role="row"]') || cell.closest('.grid-rows-AOo0Vb0') || cell.closest('div[data-row-id]');
            if (row) {
                rowId = row.getAttribute('data-row-id');
                // If row doesn't have it, look for ANY child with it
                if (!rowId) {
                    const childWithId = row.querySelector('[data-row-id]');
                    if (childWithId) rowId = childWithId.getAttribute('data-row-id');
                }
            }
        }

        if (!rowId) {
            throw new Error("Could not find Row ID for this order.");
        }

        console.log("Maestro: Found Row ID:", rowId);

        // 2. Find the Order Number button in the same row
        // We look for a cell with data-column="order-number" that indicates it belongs to this row
        // Because of virtual scrolling/grid layouts, we explicitly try to find it by attribute match
        let orderCell = document.querySelector(`[data-column="order-number"][data-row-id="${rowId}"]`);

        if (!orderCell) {
            // Fallback: If we can't find by ID, maybe it's in the same DOM row container
            const row = cell.closest('[role="row"]') || cell.closest('.grid-rows-AOo0Vb0');
            if (row) orderCell = row.querySelector('[data-column="order-number"]');
        }

        if (!orderCell) throw new Error("Order # cell not found.");

        const orderBtn = orderCell.querySelector('button');
        if (!orderBtn) throw new Error("Order # button not found.");

        // 3. Open Side Panel
        console.log("Maestro: Clicking Order # to open panel...");
        orderBtn.click();

        // 4. Handle Logic (Shipment vs Return)
        // We wait for the side panel container to appear/update
        const sidePanelSelector = '.order-details-padded-side-panel-SKwyuZo, .drawer-container-WPebrW8, [data-testid="order-details-drawer"]';
        const sidePanel = await waitForElement(sidePanelSelector, 5000);

        if (!sidePanel) throw new Error("Side panel did not open.");

        // Small delay to let data load
        await new Promise(r => setTimeout(r, 500));

        if (type === 'shipment') {
            const trackingLink = await findShipmentTrackingLink();
            if (trackingLink) {
                // Feature: Open in new tab AND Copy to clipboard
                const trackingNumber = trackingLink.split('=').pop() || ""; // Try to extract number from URL param if possible, or just open.
                // Actually, let's find the element again to get the text content for a clean copy
                const linkEl = document.querySelector('a.tracking-number-link-FqXEQWh');
                const textToCopy = linkEl ? linkEl.textContent.trim() : trackingNumber;

                if (textToCopy) {
                    await navigator.clipboard.writeText(textToCopy);
                }

                window.open(trackingLink, '_blank');
                btn.textContent = 'Done!';
            } else {
                throw new Error("No shipment tracking found");
            }
        } else if (type === 'return') {
            const trackingLink = await switchToReturnsAndGetTrackingLink();
            if (trackingLink) {
                // Feature: Open in new tab AND Copy to clipboard
                const linkEl = document.querySelector('a.tracking-number-link-FqXEQWh');
                const textToCopy = linkEl ? linkEl.textContent.trim() : "";

                if (textToCopy) {
                    await navigator.clipboard.writeText(textToCopy);
                }

                window.open(trackingLink, '_blank');
                btn.textContent = 'Done!';
            } else {
                throw new Error("No return tracking found");
            }
        }

    } catch (err) {
        console.error("Maestro Error:", err);
        btn.textContent = 'Err';
        btn.title = err.message;
        // alert("Maestro Error: " + err.message); // Disable alert for smoother UX, log is enough
    }

    // Reset button state
    setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
    }, 2000);
}

// --- Helper Functions for Side Panel Interaction ---

function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

/**
 * Tries to find a tracking number LINK.
 * Returns the href.
 */
async function findShipmentTrackingLink() {
    for (let i = 0; i < 20; i++) { // Increased retries
        // A: Specific class from user (Most reliable)
        const links = document.querySelectorAll('a.tracking-number-link-FqXEQWh');
        if (links.length > 0) return links[0].href;

        // B: Heuristic scan in side panel
        const sidePanel = document.querySelector('.order-details-padded-side-panel-SKwyuZo') || document.querySelector('.drawer-container-WPebrW8');
        if (sidePanel) {
            // Look for common carrier URLs
            const candidates = sidePanel.querySelectorAll('a[href*="Track"], a[href*="tools.usps.com"], a[href*="fedex.com"], a[href*="ups.com"], a[href*="dhl.com"]');
            if (candidates.length > 0) return candidates[0].href;
        }
        await new Promise(r => setTimeout(r, 250));
    }
    return null;
}

/**
 * Clicks the Return button/tab and looks for tracking link.
 */
async function switchToReturnsAndGetTrackingLink() {
    const clicked = await clickReturnNavButton();
    // Allow more time for the return tab to load content
    await new Promise(r => setTimeout(r, 1000));
    return await findShipmentTrackingLink();
}

async function clickReturnNavButton() {
    for (let i = 0; i < 15; i++) {
        const navButtons = Array.from(document.querySelectorAll('button'));

        let returnBtn = navButtons.find(b => {
            // Check 1: aria-label (User provided: aria-label="1 Return")
            const ariaLabel = b.getAttribute('aria-label') || "";
            // Matches "1 Return", "2 Returns", etc.
            if (/^\d+\s*Return/.test(ariaLabel)) return true;

            // Check 2: Text content (Legacy fallback)
            const text = b.textContent.replace(/\s+/g, ' ').trim();
            // Matches "Return 1"
            if (/Return\s*\d+/.test(text)) return true;

            // Check 3: Class match (User provided: sidebar-button-ZmeIzQC) combined with "Return" context
            if (b.classList.contains('sidebar-button-ZmeIzQC') && (text.includes('Return') || ariaLabel.includes('Return'))) return true;

            return false;
        });

        if (returnBtn) {
            console.log("Maestro: Clicking Return tab:", returnBtn.textContent.trim() || returnBtn.getAttribute('aria-label'));
            returnBtn.style.border = "2px solid red"; // Visual debug
            returnBtn.click();
            // Wait longer for the tab switch animation/data load
            await new Promise(r => setTimeout(r, 1000));
            return true;
        }
        await new Promise(r => setTimeout(r, 200));
    }
    return false;
}

// Global Observer Setup
// We use a debounced observer to watch for DOM changes (scrolling, initial load)
let debounceTimer;
const ssObserver = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        injectGridButtons();
    }, 200);
});

if (document.body) {
    ssObserver.observe(document.body, { childList: true, subtree: true });
    // Initial run
    injectGridButtons();
}

// --- NEW: CROSS-TAB MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'EXECUTE_SHIPSTATION_SEARCH') {
        console.log('SHIPSTATION_CONTENT: Received cross-tab search request for:', request.query);
        // ShipStation typically uses this input for global search
        const searchInput = document.querySelector('input[placeholder*="Search by"]') || document.querySelector('input.form-control');
        if (searchInput) {
            // Focus and set value
            searchInput.focus();
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(searchInput, request.query);
            
            // Dispatch Events to trigger React state changes
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Press Enter
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
            });
            searchInput.dispatchEvent(enterEvent);
            sendResponse({ success: true });
        } else {
            // Alternative: directly manipulate the URL to trigger the search view
            window.location.href = 'https://ship11.shipstation.com/orders/all-orders-search-result?quickSearch=' + encodeURIComponent(request.query);
            sendResponse({ success: true, method: 'url' });
        }
    }
});
