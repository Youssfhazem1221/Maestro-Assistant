console.log("STRIPE_CONTENT: Script injected.");

function performStripeSearch(searchTerm) {
    // Selector based on the HTML you provided
    const searchInput = document.querySelector('input[data-testid="suggestion-input"]');
    
    if (!searchInput) {
        console.error("STRIPE_CONTENT: Search input not found.");
        return false;
    }

    console.log("STRIPE_CONTENT: Setting search term:", searchTerm);

    // 1. Focus the input
    searchInput.focus();
    searchInput.click();

    // 2. React Hack: Stripe uses React, which tracks value state internally.
    // We must call the native setter to ensure React notices the change.
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    nativeInputValueSetter.call(searchInput, searchTerm);

    // 3. Dispatch events to simulate real typing
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

    // 4. Press Enter to trigger the search
    // We use a small timeout to ensure the value is registered
    setTimeout(() => {
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'Enter', 
            code: 'Enter', 
            keyCode: 13, 
            bubbles: true,
            cancelable: true
        }));
    }, 100);

    return true;
}

// Listen for the command from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "performStripeSearch") {
        const success = performStripeSearch(request.searchTerm);
        if (success) {
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "Input not found" });
        }
    }
});