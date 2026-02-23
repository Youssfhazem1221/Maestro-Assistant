// c:/Users/Moham/Downloads/test/revibe_admin_content.js
console.log("REVIBE_ADMIN_CONTENT: Script injected.");
/**
 * Finds the column index for a given header text in the table.
 * This makes the script more robust if the column order changes.
 * @param {string} headerText - The text of the header to find (e.g., 'Order Help').
 * @returns {number} The zero-based index of the column, or -1 if not found.
 */
function findColumnIndex(headerText) {
    const headers = document.querySelectorAll('thead th');
    for (let i = 0; i < headers.length; i++) {
        // Using aria-label as it's a more stable selector than the text content
        if (headers[i].getAttribute('aria-label') === headerText) {
            return i;
        }
    }
    return -1; // Return -1 if the header isn't found
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
 * Extracts all "Order Help" numbers from the table, joins them
 * with a comma, and copies the result to the clipboard.
 */
async function copyOrderHelpNumbers(event) {
    const orderHelpColumnIndex = findColumnIndex('Order Help');

    if (orderHelpColumnIndex === -1) {
        console.error('Header "Order Help" not found.');
        return;
    }

    const rows = document.querySelectorAll('tbody tr.MuiTableRow-root');
    const orderHelpNumbers = [];

    rows.forEach(row => {
        const cell = row.cells[orderHelpColumnIndex];
        if (cell) {
            // The order number is the first text node inside the div.
            const orderNumberNode = cell.querySelector('div.textEllipses')?.firstChild;
            if (orderNumberNode && orderNumberNode.nodeType === Node.TEXT_NODE) {
                const orderNumber = orderNumberNode.textContent.trim();
                if (orderNumber) {
                    orderHelpNumbers.push(orderNumber);
                }
            }
        }
    });

    if (orderHelpNumbers.length === 0) {
        return; // Silently exit if no numbers are found
    }

    const commaSeparatedNumbers = orderHelpNumbers.join(', ');

    try {
        await navigator.clipboard.writeText(commaSeparatedNumbers);
        console.log(`Copied ${orderHelpNumbers.length} Order Help number(s) to clipboard!`);

        if (event) {
            showCopiedTooltip(event.clientX, event.clientY);
        }

        // Provide visual feedback on the button instead of an alert
        const button = document.getElementById('copy-order-help-btn');
        if (button) {
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.style.backgroundColor = '#3a87ad'; // Change color to indicate success
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '#4CAF50'; // Revert to original color
            }, 2500);
        }
    } catch (err) {
        console.error('Failed to copy Order Help numbers: ', err);
    }
}

/**
 * Creates and injects the "Copy Order Help Numbers" button onto the page.
 */
function injectCopyButton() {
    const container = document.querySelector('main .MuiContainer-root');
    if (container && !document.getElementById('copy-order-help-btn')) {
        const button = document.createElement('button');
        button.id = 'copy-order-help-btn';
        button.textContent = 'Copy All Order Help #s';
        button.style.cssText = 'position: absolute; top: 10px; left: 20px; padding: 8px 12px; font-size: 14px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; z-index: 1000; transition: background-color 0.3s ease;';
        button.addEventListener('click', (e) => copyOrderHelpNumbers(e));
        container.style.position = 'relative'; // Ensure the container can position the button
        container.prepend(button);
    }
}

// The page uses a dynamic framework (React), so we need to wait for the content to be available.

// A MutationObserver is a reliable way to detect when the table is added to the DOM.
const observer = new MutationObserver(() => {
    // This function will run whenever the DOM changes.
    injectCopyButton();
});

// Start observing the document body for changes.
observer.observe(document.body, { childList: true, subtree: true });