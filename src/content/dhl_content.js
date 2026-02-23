// dhl_content.js

console.log("DHL_CONTENT: Script injected.");

/**
 * Displays a "Copied!" tooltip near the cursor.
 * @param {number} x - The clientX position of the cursor.
 * @param {number} y - The clientY position of the cursor.
 */
function showCopiedTooltip(x, y) {
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Copied ya basha!';
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y - 30}px`; // Above cursor
    tooltip.style.background = '#d40511'; // DHL Red
    tooltip.style.color = '#FFCC00';      // DHL Yellow
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '5px';
    tooltip.style.fontSize = '12px';
    tooltip.style.fontWeight = 'bold';
    tooltip.style.border = '1px solid #FFCC00';
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
 * Creates and injects a "Copy 80%" button next to a target element.
 * @param {HTMLElement} targetElement - The div containing the value.
 */
function createVatButton(targetElement) {
    // Use a unique attribute to prevent adding duplicate buttons
    const buttonId = 'dhl-vat-button-for-' + (targetElement.textContent.trim() || 'element');
    if (document.getElementById(buttonId) || targetElement.dataset.vatButtonAdded) {
        return; // Button already exists for this element
    }
    targetElement.dataset.vatButtonAdded = 'true';

    const button = document.createElement('button');
    button.id = buttonId;
    button.textContent = 'Copy 80%';
    button.title = 'Calculate 80% of the value and copy to clipboard';

    // --- Styling for the button ---
    button.style.marginLeft = '10px';
    button.style.padding = '4px 8px';
    button.style.fontSize = '12px';
    button.style.color = 'white';
    button.style.backgroundColor = '#d40511'; // DHL Red
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';

    button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const valueText = targetElement.textContent.trim();
        const originalValue = parseFloat(valueText);

        if (isNaN(originalValue)) {
            console.error("DHL_CONTENT: Could not parse value:", valueText);
            button.textContent = 'Error!';
            setTimeout(() => { button.textContent = 'Copy 80%'; }, 2000);
            return;
        }

        const result = originalValue * 0.8;
        const resultString = result.toFixed(2); // Format to 2 decimal places

        navigator.clipboard.writeText(resultString).then(() => {
            console.log(`DHL_CONTENT: Copied '${resultString}' to clipboard.`);
            showCopiedTooltip(e.clientX, e.clientY);
            button.textContent = 'Copied!';
            setTimeout(() => { button.textContent = 'Copy 80%'; }, 2000);
        }).catch(err => {
            console.error('DHL_CONTENT: Failed to copy text: ', err);
            button.textContent = 'Copy Failed';
            setTimeout(() => { button.textContent = 'Copy 80%'; }, 2000);
        });
    });

    // Insert the button right after the value div
    targetElement.parentNode.appendChild(button);
}

/**
 * Finds target elements on the page and injects buttons.
 * This function is called by the MutationObserver.
 */
function findAndInjectButtons() {
    // The selector targets the specific div inside the 3rd column's td
    const targetElements = document.querySelectorAll('td[data-col-index="3"] div.ssit-footer-value');
    targetElements.forEach(element => {
        // Check if the element is visible and hasn't had a button added yet
        if (element.offsetParent !== null && !element.dataset.vatButtonAdded) {
            createVatButton(element);
        }
    });
}

// Use a MutationObserver to handle dynamically loaded content
const observer = new MutationObserver(findAndInjectButtons);
observer.observe(document.body, { childList: true, subtree: true });

// Run once on initial load as well
findAndInjectButtons();