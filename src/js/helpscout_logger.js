// =============================================================================
// MAESTRO HELPSCOUT ACTIVITY LOGGER
// =============================================================================
// Tracks all user interactions in HelpScout for workflow analysis and automation

console.log("📊 MAESTRO ACTIVITY LOGGER: Initializing...");

const MaestroActivityLogger = {
    enabled: true,
    logs: [],
    maxLogs: 1000, // Keep last 1000 interactions
    sessionStart: Date.now(),

    // Log an activity
    log(activity) {
        if (!this.enabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            sessionTime: Date.now() - this.sessionStart,
            ...activity
        };

        this.logs.push(logEntry);

        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // Console output with emoji for easy visual scanning
        console.log(`📊 [${activity.type}]`, logEntry);
    },

    // Export logs as JSON
    exportLogs() {
        const data = {
            exportTime: new Date().toISOString(),
            sessionDuration: Date.now() - this.sessionStart,
            totalActivities: this.logs.length,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `maestro-activity-log-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log("📊 Activity logs exported!");
    },

    // Clear logs
    clearLogs() {
        this.logs = [];
        this.sessionStart = Date.now();
        console.log("📊 Activity logs cleared!");
    },

    // Get element details for logging
    getElementDetails(element) {
        if (!element) return null;

        return {
            tagName: element.tagName,
            id: element.id || null,
            className: element.className || null,
            text: element.textContent?.substring(0, 100) || null,
            href: element.href || null,
            dataTestId: element.getAttribute('data-testid') || null,
            ariaLabel: element.getAttribute('aria-label') || null
        };
    },

    // Extract HelpScout-specific context
    getHelpScoutContext() {
        const url = window.location.href;
        const conversationMatch = url.match(/\/conversation\/(\d+)/);
        const mailboxMatch = url.match(/\/mailbox\/(\d+)/);

        return {
            url: url,
            conversationId: conversationMatch ? conversationMatch[1] : null,
            mailboxId: mailboxMatch ? mailboxMatch[1] : null,
            pathname: window.location.pathname,
            hash: window.location.hash
        };
    }
};

// =============================================================================
// CLICK TRACKING
// =============================================================================

document.addEventListener('click', (event) => {
    const target = event.target;
    const element = MaestroActivityLogger.getElementDetails(target);
    const context = MaestroActivityLogger.getHelpScoutContext();

    // Detect what type of click this is
    let actionType = 'UNKNOWN_CLICK';
    let actionDetails = {};

    // Conversation click
    if (target.closest('a[href*="/conversation/"]')) {
        actionType = 'CONVERSATION_OPEN';
        const link = target.closest('a');
        const convId = link.href.match(/\/conversation\/(\d+)/)?.[1];
        actionDetails = {
            conversationId: convId,
            conversationLink: link.href
        };
    }
    // Button clicks
    else if (target.tagName === 'BUTTON' || target.closest('button')) {
        const button = target.tagName === 'BUTTON' ? target : target.closest('button');
        actionType = 'BUTTON_CLICK';
        actionDetails = {
            buttonText: button.textContent?.trim(),
            buttonAriaLabel: button.getAttribute('aria-label'),
            buttonDataTestId: button.getAttribute('data-testid')
        };

        // Specific button actions
        if (button.textContent?.includes('Reply')) actionType = 'REPLY_BUTTON';
        if (button.textContent?.includes('Note')) actionType = 'NOTE_BUTTON';
        if (button.textContent?.includes('Forward')) actionType = 'FORWARD_BUTTON';
        if (button.textContent?.includes('Delete')) actionType = 'DELETE_BUTTON';
        if (button.textContent?.includes('Assign')) actionType = 'ASSIGN_BUTTON';
        if (button.textContent?.includes('Close')) actionType = 'CLOSE_BUTTON';
        if (button.textContent?.includes('Spam')) actionType = 'SPAM_BUTTON';
    }
    // Link clicks
    else if (target.tagName === 'A' || target.closest('a')) {
        actionType = 'LINK_CLICK';
        const link = target.tagName === 'A' ? target : target.closest('a');
        actionDetails = {
            href: link.href,
            linkText: link.textContent?.trim()
        };
    }
    // Dropdown/Select
    else if (target.tagName === 'SELECT') {
        actionType = 'DROPDOWN_CHANGE';
        actionDetails = {
            selectedValue: target.value,
            selectedText: target.options[target.selectedIndex]?.text
        };
    }
    // Checkbox
    else if (target.type === 'checkbox') {
        actionType = 'CHECKBOX_TOGGLE';
        actionDetails = {
            checked: target.checked,
            label: target.labels?.[0]?.textContent
        };
    }

    MaestroActivityLogger.log({
        type: actionType,
        element: element,
        context: context,
        details: actionDetails,
        position: {
            x: event.clientX,
            y: event.clientY
        }
    });
}, true); // Use capture phase to catch all clicks

// =============================================================================
// FORM INPUT TRACKING
// =============================================================================

document.addEventListener('input', (event) => {
    const target = event.target;

    // Only log form fields, not every keypress
    if (!target.matches('input, textarea, select')) return;

    const element = MaestroActivityLogger.getElementDetails(target);
    const context = MaestroActivityLogger.getHelpScoutContext();

    let actionType = 'FORM_INPUT';
    let actionDetails = {
        fieldType: target.type,
        fieldName: target.name,
        valueLength: target.value?.length || 0
    };

    // Detect specific input types
    if (target.classList.contains('c-Editor') || target.closest('[data-testid*="Editor"]')) {
        actionType = 'REPLY_COMPOSE';
        actionDetails.editorType = 'reply';
    } else if (target.placeholder?.toLowerCase().includes('note')) {
        actionType = 'NOTE_COMPOSE';
        actionDetails.editorType = 'note';
    } else if (target.placeholder?.toLowerCase().includes('search')) {
        actionType = 'SEARCH_INPUT';
        actionDetails.searchQuery = target.value?.substring(0, 50);
    }

    MaestroActivityLogger.log({
        type: actionType,
        element: element,
        context: context,
        details: actionDetails
    });
}, true);

// =============================================================================
// NAVIGATION TRACKING
// =============================================================================

let lastUrl = window.location.href;
const checkUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        const oldContext = MaestroActivityLogger.getHelpScoutContext();
        lastUrl = currentUrl;

        MaestroActivityLogger.log({
            type: 'NAVIGATION',
            context: MaestroActivityLogger.getHelpScoutContext(),
            details: {
                method: 'url_change',
                previousUrl: oldContext.url
            }
        });
    }
};

// Check for URL changes (for SPA navigation)
setInterval(checkUrlChange, 500);

// =============================================================================
// KEYBOARD SHORTCUTS TRACKING
// =============================================================================

document.addEventListener('keydown', (event) => {
    // Only log keyboard shortcuts (with modifier keys)
    if (!event.ctrlKey && !event.metaKey && !event.altKey) return;

    const context = MaestroActivityLogger.getHelpScoutContext();

    MaestroActivityLogger.log({
        type: 'KEYBOARD_SHORTCUT',
        context: context,
        details: {
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            code: event.code
        }
    });
});

// =============================================================================
// HELPSCOUT-SPECIFIC ACTIONS
// =============================================================================

// Watch for HelpScout's own events (if available)
const observeHelpScoutActions = () => {
    // Watch for status changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Skip if not an element node (text nodes don't have closest/classList)
            if (!mutation.target || mutation.target.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            // Look for status badge changes
            if (mutation.target.classList?.contains('c-Status') ||
                mutation.target.closest('[class*="Status"]')) {
                MaestroActivityLogger.log({
                    type: 'STATUS_CHANGE',
                    context: MaestroActivityLogger.getHelpScoutContext(),
                    details: {
                        newStatus: mutation.target.textContent?.trim()
                    }
                });
            }

            // Look for assignment changes
            if (mutation.target.classList?.contains('c-Avatar') ||
                mutation.target.closest('[class*="Avatar"]')) {
                MaestroActivityLogger.log({
                    type: 'ASSIGNMENT_CHANGE',
                    context: MaestroActivityLogger.getHelpScoutContext(),
                    details: {
                        assignedTo: mutation.target.textContent?.trim()
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
};

observeHelpScoutActions();

// =============================================================================
// EXPORT CONTROLS
// =============================================================================

// Add keyboard shortcut to export logs (Ctrl+Shift+E)
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        MaestroActivityLogger.exportLogs();
    }
});

// Add a floating button for easy export
const createExportButton = () => {
    const button = document.createElement('button');
    button.id = 'maestro-logger-export';
    button.innerHTML = '📊';
    button.title = 'Export Activity Logs (Ctrl+Shift+E)';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #2563eb;
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 99999;
        transition: transform 0.2s;
    `;

    button.onmouseenter = () => {
        button.style.transform = 'scale(1.1)';
    };

    button.onmouseleave = () => {
        button.style.transform = 'scale(1)';
    };

    button.onclick = () => {
        MaestroActivityLogger.exportLogs();
    };

    document.body.appendChild(button);
};

// Create export button after a delay
setTimeout(createExportButton, 2000);

// =============================================================================
// INITIAL LOG
// =============================================================================

MaestroActivityLogger.log({
    type: 'SESSION_START',
    context: MaestroActivityLogger.getHelpScoutContext(),
    details: {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`
    }
});

console.log("📊 MAESTRO ACTIVITY LOGGER: Ready!");
console.log("📊 Press Ctrl+Shift+E to export logs or click the 📊 button");

// Make it accessible globally for debugging
window.MaestroActivityLogger = MaestroActivityLogger;
