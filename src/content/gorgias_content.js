// gorgias_content.js

const GEMINI_ASSISTANT_ID = 'gemini-assistant-container';
// Updated selector based on provided HTML: target the form where the reply area is.
const GORGIAS_REPLY_AREA_SELECTOR = 'form#ticket-reply-editor';
// Updated selector based on provided HTML: target the main messages container.
// Note: This class 'TicketBody--wrapper--qc1N1' appears to be a hashed class and might change.
// If this breaks, look for a data-testid on a parent of the messages.
const GORGIAS_MESSAGES_CONTAINER_SELECTOR = 'div.TicketBody--wrapper--qc1N1';
// Use data-testid for message items as it's more stable than hashed classes.
const GORGIAS_MESSAGE_ITEM_SELECTOR = 'div[data-testid^="ticket-message-"]';
// Use a more stable class for the message content wrapper.
const GORGIAS_MESSAGE_TEXT_SELECTOR = '.message-content'; // Relative to GORGIAS_MESSAGE_ITEM_SELECTOR
// This selector targets the entire customer info sidebar panel using a stable data attribute.
// This ensures all widgets (customer details, Shopify orders, etc.) are included for the AI's context.
const GORGIAS_CUSTOMER_INFO_SIDEBAR_SELECTOR = 'div[data-panel-name="infobar"]';

/**
 * Creates and injects a "Search Claims" button next to a reference element.
 * @param {string} textToSearch - The email or order ID to search for.
 * @param {string} searchType - 'email' or 'order'.
 * @param {HTMLElement} referenceElement - The element to insert the button after.
 */
function createSearchButton(textToSearch, searchType, referenceElement) {
    if (!referenceElement || !referenceElement.parentNode) {
        console.warn("GORGIAS_CONTENT: Cannot create button, referenceElement or its parent is null for text:", textToSearch);
        return;
    }
    // Check if button already exists to prevent duplicates
    if (referenceElement.nextSibling && referenceElement.nextSibling.matches && referenceElement.nextSibling.matches(`button[data-search-term="${textToSearch}"]`)) {
        return;
    }

    const button = document.createElement('button');
    button.setAttribute('data-search-term', textToSearch);
    button.textContent = `Search Claims`;
    button.title = `Search Claims App for: ${textToSearch}`;
    button.style.marginLeft = '8px';
    button.style.padding = '2px 6px';
    button.style.fontSize = '10px';
    button.style.backgroundColor = '#20c997';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '3px';
    button.style.cursor = 'pointer';
    button.style.verticalAlign = 'middle';
    button.style.lineHeight = 'normal';

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`GORGIAS_CONTENT: In-page button clicked for: ${textToSearch} (Type: ${searchType})`);
        // Use the modern 'searchClaimsApp' action handled by the background script
        chrome.runtime.sendMessage({
            action: "searchClaimsApp",
            searchTerm: textToSearch
        });
    });
    referenceElement.parentNode.insertBefore(button, referenceElement.nextSibling);
}

/** Finds email and order number elements on the page and injects search buttons. */
function findAndInjectButtons() {
    const emailLinkElements = document.querySelectorAll('div[class*="CustomerChannels--customerChannel"] a[href^="mailto:"]');
    emailLinkElements.forEach(emailLinkElement => {
        const customerEmail = emailLinkElement.textContent.trim();
        if (customerEmail && emailLinkElement.offsetParent !== null) createSearchButton(customerEmail, 'email', emailLinkElement);
    });

    const orderLinkElements = document.querySelectorAll('a[class*="Order--orderTitle"]');
    orderLinkElements.forEach(orderEl => {
        const orderId = orderEl.textContent.trim();
        if (orderId && (orderId.startsWith('SA-') || /^\d+$/.test(orderId)) && orderEl.offsetParent !== null) createSearchButton(orderId, 'order', orderEl);
    });
}

/** Injects the Gemini Assistant UI into the Gorgias page. */
function injectAssistantUI() {
    if (document.getElementById(GEMINI_ASSISTANT_ID)) return;
    const replyArea = document.querySelector(GORGIAS_REPLY_AREA_SELECTOR);
    if (!replyArea) return;

    const assistantContainer = document.createElement('div');
    assistantContainer.id = GEMINI_ASSISTANT_ID;
    assistantContainer.style.border = '1px solid #ddd';
    assistantContainer.style.borderRadius = '8px';
    assistantContainer.style.padding = '15px';
    assistantContainer.style.marginBottom = '15px';
    assistantContainer.style.backgroundColor = '#f9f9f9';

    assistantContainer.innerHTML = `
        <style>
            #${GEMINI_ASSISTANT_ID} .gemini-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            #${GEMINI_ASSISTANT_ID} .gemini-header h3 { margin: 0; font-size: 16px; color: #333; }
            #${GEMINI_ASSISTANT_ID} .gemini-header-buttons { display: flex; gap: 8px; }
            #${GEMINI_ASSISTANT_ID} button { background-color: #673ab7; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-size: 13px; transition: background-color 0.2s; }
            #${GEMINI_ASSISTANT_ID} button:not(:disabled):hover { background-color: #5e35b1; }
            #${GEMINI_ASSISTANT_ID} button:disabled { background-color: #b39ddb; cursor: not-allowed; }
            #${GEMINI_ASSISTANT_ID} #gemini-copy-btn { background-color: #546e7a; }
            #${GEMINI_ASSISTANT_ID} #gemini-copy-btn:not(:disabled):hover { background-color: #455a64; }
            #${GEMINI_ASSISTANT_ID} #gemini-status { font-size: 12px; margin-bottom: 10px; min-height: 18px; transition: color 0.3s ease; }
            #${GEMINI_ASSISTANT_ID} .gemini-instructions-label { font-size: 12px; font-weight: bold; margin-top: 10px; display: block; color: #555; }
            #${GEMINI_ASSISTANT_ID} #gemini-special-instructions { width: 100%; box-sizing: border-box; min-height: 60px; border: 1px solid #ccc; border-radius: 5px; padding: 8px; font-size: 13px; resize: vertical; margin-top: 4px; margin-bottom: 10px; }
            #${GEMINI_ASSISTANT_ID} #gemini-suggestion-area { width: 100%; box-sizing: border-box; min-height: 120px; border: 1px solid #ccc; border-radius: 5px; padding: 8px; font-size: 14px; resize: vertical; }
        </style>
        <div class="gemini-header">
            <h3>✨ Groq Assistant</h3>
            <div class="gemini-header-buttons">
                <button id="gemini-copy-btn" title="Copy Suggestion" style="display: none;">Copy</button>
                <button id="gemini-generate-btn">Generate</button>
            </div>
        </div>
        <div id="gemini-status">Ready</div>
        <label for="gemini-special-instructions" class="gemini-instructions-label">Special Instructions (for this ticket only):</label>
        <textarea id="gemini-special-instructions" placeholder="e.g., Offer a 10% discount. The customer is very angry. Prioritize speed."></textarea>
        <textarea id="gemini-suggestion-area" placeholder="AI-generated suggestion will appear here..."></textarea>
    `;
    // Insert before the replyArea's parent, or adjust as needed for visual placement.
    // Let's try inserting it inside the parent of the form, before the form itself, to keep it within the editor container.
    const editorContainer = replyArea.closest('div.Editor--container--BemuU');
    if (editorContainer) {
        editorContainer.insertBefore(assistantContainer, replyArea);
    } else {
        // Fallback if the structure changes or is not as expected
        replyArea.parentNode.insertBefore(assistantContainer, replyArea);
    }
    document.getElementById('gemini-generate-btn').addEventListener('click', handleGenerateClick);
    document.getElementById('gemini-copy-btn').addEventListener('click', (e) => handleCopyClick(e));
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

/** Scrapes the entire ticket thread. */
function scrapeTicketThread() {
    const messagesContainer = document.querySelector(GORGIAS_MESSAGES_CONTAINER_SELECTOR);
    if (!messagesContainer) {
        console.error("Gemini Assistant: Error: Could not find messages container.");
        return "Error: Could not find messages container.";
    }

    const messages = Array.from(messagesContainer.querySelectorAll(GORGIAS_MESSAGE_ITEM_SELECTOR));
    const formattedMessages = [];

    messages.forEach(msg => {
        let isCustomer = true; // Default to customer, and then look for signs of it being an agent.
        let authorIdentifier = '';

        const authorDiv = msg.querySelector('div[class*="Header--author--"]');
        if (authorDiv) {
            authorIdentifier = `(${authorDiv.textContent.trim()})`;
            // Priority 1: Check for a specific agent class. This is the most reliable signal.
            if (authorDiv.classList.contains('Header--isAgent--vOp4L')) {
                isCustomer = false;
            }
        }

        // Priority 2: If not confirmed as agent by class, check avatar alt text for keywords.
        if (isCustomer) {
            const avatarImg = msg.querySelector('img[alt]');
            if (avatarImg && avatarImg.alt) {
                const altText = avatarImg.alt.toLowerCase();
                // If alt text contains 'agent' or 'support', it's very likely an agent.
                if (altText.includes('agent') || altText.includes('support')) {
                    isCustomer = false;
                }
            }
        }

        const prefix = isCustomer ? "Customer:" : "Agent:";
        const textEl = msg.querySelector(GORGIAS_MESSAGE_TEXT_SELECTOR);
        if (textEl) {
            // Add the author identifier to the line for clarity for the AI.
            formattedMessages.push(`${prefix} ${authorIdentifier} ${textEl.innerText.trim()}`);
        }
    });

    // Take only the last 5 messages, or all if there are fewer than 5
    const messagesToSend = formattedMessages.slice(Math.max(formattedMessages.length - 5, 0));

    return messagesToSend.join('\n\n');
}

/** Scrapes the customer information from the sidebar. */
function scrapeCustomerInfo() {
    const sidebar = document.querySelector(GORGIAS_CUSTOMER_INFO_SIDEBAR_SELECTOR);
    if (!sidebar) {
        console.error("Gemini Assistant: Error: Could not find customer sidebar panel using selector:", GORGIAS_CUSTOMER_INFO_SIDEBAR_SELECTOR);
        return "Error: Could not find customer sidebar panel.";
    }
    return `Customer Sidebar Info:\n${sidebar.innerText}`;
}

/** Handles the click event for the "Generate Suggestion" button. */
function handleGenerateClick() {
    const generateBtn = document.getElementById('gemini-generate-btn');
    const specialInstructionsArea = document.getElementById('gemini-special-instructions');
    const statusDiv = document.getElementById('gemini-status');

    if (!generateBtn || !statusDiv) {
        console.error('Gemini Assistant: Generate button or status div not found.');
        return;
    }
    generateBtn.disabled = true;
    statusDiv.textContent = 'Gathering context and generating...';
    statusDiv.style.color = 'orange';

    const specialInstructions = specialInstructionsArea ? specialInstructionsArea.value.trim() : '';

    // Ensure chrome.runtime is available (for content scripts)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
            action: 'generateSuggestion',
            data: {
                ticketThread: scrapeTicketThread(),
                customerInfo: scrapeCustomerInfo(),
                specialInstructions: specialInstructions
            }
        });
    } else {
        statusDiv.textContent = 'Error: chrome.runtime API not available. Is this running as a content script?';
        statusDiv.style.color = 'red';
        generateBtn.disabled = false;
        console.error('Gemini Assistant: chrome.runtime API not available.');
    }
}

/** Handles the click event for the "Copy" button. */
function handleCopyClick(e) {
    const suggestionArea = document.getElementById('gemini-suggestion-area');
    const statusDiv = document.getElementById('gemini-status');
    const copyBtn = document.getElementById('gemini-copy-btn');

    if (suggestionArea && suggestionArea.value) {
        navigator.clipboard.writeText(suggestionArea.value).then(() => {
            showCopiedTooltip(e.clientX, e.clientY);
            if (statusDiv) {
                statusDiv.textContent = 'Suggestion copied to clipboard!';
                statusDiv.style.color = 'green';
            }
            if (copyBtn) copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                if (copyBtn) copyBtn.textContent = 'Copy';
            }, 2000);
        }).catch(err => {
            console.error('GORGIAS_CONTENT: Failed to copy text: ', err);
            if (statusDiv) {
                statusDiv.textContent = 'Error: Could not copy text.';
                statusDiv.style.color = 'red';
            }
        });
    }
}

/** Main execution logic */
function initialize() {
    // Use a single, continuous MutationObserver for all UI injections.
    // This is more efficient and robust for a dynamic single-page application like Gorgias.
    if (window.gorgiasHelperObserver) {
        return; // Observer already running
    }

    let debounceTimer;
    const runAllInjections = () => {
        // Debounce to prevent firing too rapidly on complex DOM changes
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            injectAssistantUI();
            findAndInjectButtons();
        }, 750); // A 750ms debounce should be sufficient
    };

    const observer = new MutationObserver(runAllInjections);
    observer.observe(document.body, { childList: true, subtree: true });
    window.gorgiasHelperObserver = observer; // Store observer on window to prevent re-initialization

    console.log("GORGIAS_CONTENT: Main observer started for UI injections.");
    runAllInjections(); // Run once on initial load
}


// --- MESSAGE LISTENERS ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'displaySuggestion': {
            const suggestionArea = document.getElementById('gemini-suggestion-area');
            const copyBtn = document.getElementById('gemini-copy-btn');
            const generateBtn = document.getElementById('gemini-generate-btn');
            const statusDiv = document.getElementById('gemini-status');
            if (suggestionArea) suggestionArea.value = request.suggestion;
            if (statusDiv) {
                statusDiv.textContent = 'Suggestion generated successfully!';
                statusDiv.style.color = 'green';
            }
            if (copyBtn) copyBtn.style.display = 'inline-block';
            if (generateBtn) generateBtn.disabled = false;
            break;
        }
        case 'displayError': {
            const generateBtn = document.getElementById('gemini-generate-btn');
            const statusDiv = document.getElementById('gemini-status');
            if (statusDiv) {
                statusDiv.textContent = `Error: ${request.error}`;
                statusDiv.style.color = 'red';
            }
            if (generateBtn) generateBtn.disabled = false;
            break;
        }
        case "extractGorgiasCustomerEmail": {
            console.log("GORGIAS_CONTENT: Received 'extractGorgiasCustomerEmail' request from popup.");
            // --- FIX ---
            // The previous selector was too specific and used a hashed class name that changed, causing it to fail.
            // This new logic is more robust. It first finds the main customer info sidebar using a stable data-testid,
            // then looks for the first email link within it. This is much less likely to break.
            const customerInfoSidebar = document.querySelector(GORGIAS_CUSTOMER_INFO_SIDEBAR_SELECTOR);
            let emailLinkElement = null;
            if (customerInfoSidebar) {
                // Find the first link that starts with "mailto:" inside the sidebar.
                emailLinkElement = customerInfoSidebar.querySelector('a[href^="mailto:"]');
            }

            if (!emailLinkElement) {
                console.error("GORGIAS_CONTENT: Could not find customer email link. The selector might need updating. Sidebar found:", !!customerInfoSidebar);
                sendResponse({ error: "Gorgias Page: Could not find customer email." });
                return true;
            }

            sendResponse({ data: { customerEmail: emailLinkElement.textContent.trim() } });
            return true; // Keep channel open for async response
        }
    }
});

initialize();
            }
            if (copyBtn) copyBtn.style.display = 'inline-block';
            if (generateBtn) generateBtn.disabled = false;
            break;
        }
        case 'displayError': {
            const generateBtn = document.getElementById('gemini-generate-btn');
            const statusDiv = document.getElementById('gemini-status');
            if (statusDiv) {
                statusDiv.textContent = `Error: ${request.error}`;
                statusDiv.style.color = 'red';
            }
            if (generateBtn) generateBtn.disabled = false;
            break;
        }
        case "extractGorgiasCustomerEmail": {
            console.log("GORGIAS_CONTENT: Received 'extractGorgiasCustomerEmail' request from popup.");
            // --- FIX ---
            // The previous selector was too specific and used a hashed class name that changed, causing it to fail.
            // This new logic is more robust. It first finds the main customer info sidebar using a stable data-testid,
            // then looks for the first email link within it. This is much less likely to break.
            const customerInfoSidebar = document.querySelector(GORGIAS_CUSTOMER_INFO_SIDEBAR_SELECTOR);
            let emailLinkElement = null;
            if (customerInfoSidebar) {
                // Find the first link that starts with "mailto:" inside the sidebar.
                emailLinkElement = customerInfoSidebar.querySelector('a[href^="mailto:"]');
            }

            if (!emailLinkElement) {
                console.error("GORGIAS_CONTENT: Could not find customer email link. The selector might need updating. Sidebar found:", !!customerInfoSidebar);
                sendResponse({ error: "Gorgias Page: Could not find customer email." });
                return true;
            }

            sendResponse({ data: { customerEmail: emailLinkElement.textContent.trim() } });
            return true; // Keep channel open for async response
        }
    }
});

initialize();
