console.log("GIDDYUP_CONTENT: Script injected.");

function waitForAndClickFirstOrder() {
    // 1. Verify we are on a search result page (URL has 'email' parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('email') && !urlParams.has('customer_name')) {
        return;
    }

    console.log("GIDDYUP_CONTENT: Search detected. Waiting for results...");

    // 2. Define the selector for the first row's action button
    // Based on HTML: <div ... data-rowindex="0" ...> ... <div data-field="action"> <a href="...">
    // We target the anchor tag inside the action cell of the first row (index 0).
    const actionButtonSelector = '.MuiDataGrid-row[data-rowindex="0"] [data-field="action"] a';

    // 3. Use MutationObserver to wait for the element to appear
    const observer = new MutationObserver((mutations, obs) => {
        const actionLink = document.querySelector(actionButtonSelector);
        
        if (actionLink) {
            console.log("GIDDYUP_CONTENT: First order found. Clicking...", actionLink);
            actionLink.click();
            obs.disconnect(); // Stop observing once clicked
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 4. Fallback/Safety: Stop looking after 10 seconds to prevent infinite resource usage
    setTimeout(() => {
        observer.disconnect();
    }, 10000);
}

// Run logic
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForAndClickFirstOrder);
} else {
    waitForAndClickFirstOrder();
}