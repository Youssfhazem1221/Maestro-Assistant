/**
 * MAESTRO UNIVERSAL ACTIVITY LOGGER
 * Captures user interactions across browser and extension UI.
 */

const UniversalLogger = {
    enabled: true,
    
    // Initialize tracking
    init() {
        if (!this.enabled) return;
        
        // Track clicks
        document.addEventListener('click', (e) => this.handleClick(e), true);
        
        // Track form inputs (throttled)
        document.addEventListener('input', (e) => this.handleInput(e), true);
        
        // Track URL changes (for SPAs)
        this.trackNavigation();
        
        console.log("🚀 Maestro Universal Logger: Initialized");
    },

    // Log data to background script
    async log(type, details) {
        const logEntry = {
            type,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
            details,
            source: this.get_source_type()
        };

        try {
            chrome.runtime.sendMessage({
                action: 'LOG_ACTIVITY',
                data: logEntry
            });
        } catch (e) {
            // Extension context might be invalidated if updated
            console.warn("Maestro Logger: Failed to send log", e);
        }
    },

    // Get source type (content_script, popup, options)
    get_source_type() {
        if (window.location.protocol === 'chrome-extension:') {
            if (window.location.pathname.includes('popup.html')) return 'extension_popup';
            if (window.location.pathname.includes('options.html')) return 'extension_options';
            return 'extension_page';
        }
        return 'browser_tab';
    },

    // Handle click events
    handleClick(event) {
        const target = event.target;
        const elementDetails = {
            tagName: target.tagName,
            id: target.id || null,
            className: target.className || null,
            text: target.textContent?.trim().substring(0, 50) || null,
            dataPath: this.getElementPath(target),
            rect: target.getBoundingClientRect()
        };

        this.log('CLICK', elementDetails);
    },

    // Handle input events
    handleInput(event) {
        const target = event.target;
        if (!target.matches('input, textarea, select')) return;

        // Debounce/Throttle logging for inputs to avoid noise
        if (target._lastLogTime && Date.now() - target._lastLogTime < 2000) return;
        target._lastLogTime = Date.now();

        const inputDetails = {
            tagName: target.tagName,
            type: target.type,
            id: target.id || null,
            name: target.name || null,
            // DO NOT log the actual value for privacy, just the length or existence
            hasValue: !!target.value,
            valueLength: target.value?.length || 0
        };

        this.log('INPUT', inputDetails);
    },

    // Track navigation for SPAs
    trackNavigation() {
        let lastUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                const oldUrl = lastUrl;
                lastUrl = window.location.href;
                this.log('NAVIGATION', {
                    from: oldUrl,
                    to: lastUrl
                });
            }
        }, 1000);
    },

    // Helper to get a simplified DOM path
    getElementPath(el) {
        const path = [];
        let current = el;
        while (current && current !== document.body && path.length < 3) {
            let selector = current.tagName.toLowerCase();
            if (current.id) selector += `#${current.id}`;
            else if (current.className) selector += `.${current.className.split(' ').join('.')}`;
            path.unshift(selector);
            current = current.parentElement;
        }
        return path.join(' > ');
    }
};

// Auto-initialize
UniversalLogger.init();
