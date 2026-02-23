/**
 * Jira Automation Script for Lab Communications
 */

const JIRA_AUTOMATION = {
    async init() {
        console.log("JIRA_AUTOMATION: Script initialized.");
        const data = await this.getPendingData();
        if (data) {
            console.log("JIRA_AUTOMATION: Found pending Lab Comm data:", data);
            this.runAutomation(data);
        }
    },

    getPendingData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['pendingLabComm'], (result) => {
                if (result.pendingLabComm) {
                    const diff = Date.now() - result.pendingLabComm.timestamp;
                    if (diff < 120000) { // Fresh if less than 2 mins old
                        resolve(result.pendingLabComm);
                    } else {
                        chrome.storage.local.remove(['pendingLabComm']);
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
    },

    async runAutomation(data) {
        // Step 1: Click "Create" button if modal not open
        if (!document.querySelector('div[role="dialog"]')) {
            const createBtn = await this.waitForElement('button[data-testid="atlassian-navigation--create-button"]', 10000);
            if (createBtn) {
                console.log("JIRA_AUTOMATION: Clicking Create button...");
                createBtn.click();
            } else {
                console.log("JIRA_AUTOMATION: Create button not found. Checking if modal is already open...");
            }
        }

        // Step 2: Handle Modal Fields
        await this.handleModal(data);

        // Clean up
        chrome.storage.local.remove(['pendingLabComm']);
    },

    async handleModal(data) {
        console.log("JIRA_AUTOMATION: Waiting for modal...");
        const modal = await this.waitForElement('div[role="dialog"]', 15000);
        if (!modal) {
            console.error("JIRA_AUTOMATION: Modal never appeared.");
            return;
        }

        // --- 1. Project Selection (Space) ---
        // Target: "Lab Communications (LAB)"
        await this.handleAtlassianSelect('Space', 'Lab Communications (LAB)');

        // --- 2. Issue Type Selection (Work type) ---
        // Target: "Lab Question"
        await this.handleAtlassianSelect('Work type', 'Lab Question');

        // --- 3. Summary ---
        const summaryValue = `SSV - ${data.name} - ${data.orderId}`;
        await this.fillFormField('Summary', summaryValue);

        // --- 4. Customer Name (Custom Field) ---
        // customfield_10029-field
        await this.fillFormField('Customer Name', data.name);

        // --- 5. Order Number (Custom Field) ---
        // customfield_10030-field
        await this.fillFormField('Order Number', data.orderId);

        // --- 6. Helpscout Link (Custom Field) ---
        // customfield_10034-field
        if (data.helpscoutLink) {
            await this.fillFormField('Helpscout Link', data.helpscoutLink);
        }

        // --- 7. Handle Customer Photos ---
        if (data.customerPhotos && data.customerPhotos.length > 0) {
            this.handleCustomerPhotos(data.customerPhotos);
        }

        console.log("JIRA_AUTOMATION: Automation complete.");
    },

    /**
     * Creates a small floating assistant to help with uploading captured photos.
     */
    async handleCustomerPhotos(photos) {
        console.log("JIRA_AUTOMATION: Presenting customer photos for upload...");

        const assistantId = 'jira-photo-assistant';
        if (document.getElementById(assistantId)) return;

        const assistant = document.createElement('div');
        assistant.id = assistantId;
        assistant.style = `
            position: fixed; bottom: 20px; right: 20px; width: 300px;
            background: white; border-radius: 12px; border: 1px solid #dfe1e6;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            overflow: hidden; animation: slideUp 0.3s ease-out;
        `;

        assistant.innerHTML = `
            <style>
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .photo-header { background: #0052CC; color: white; padding: 12px; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
                .photo-list { padding: 10px; max-height: 300px; overflow-y: auto; }
                .photo-item { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 6px; border-radius: 6px; background: #f4f5f7; border: 1px solid transparent; transition: all 0.2s; }
                .photo-item:hover { border-color: #4c9aff; background: #ebf5ff; }
                .photo-thumb { width: 50px; height: 50px; border-radius: 4px; object-fit: cover; background: #ebecf0; }
                .copy-btn { background: #0052CC; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
                .copy-btn:hover { background: #0747A6; }
                .instructions { font-size: 11px; color: #6b778c; padding: 0 10px 10px 10px; line-height: 1.4; }
            </style>
            <div class="photo-header">
                <span>Customer Photos (${photos.length})</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button id="skip-photos" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; cursor: pointer; font-size: 11px; padding: 2px 6px; border-radius: 4px;">Skip</button>
                    <button id="close-assistant" style="background:none; border:none; color:white; cursor:pointer; font-size:16px;">&times;</button>
                </div>
            </div>
            <div class="photo-list">
                ${photos.map((p, i) => `
                    <div class="photo-item">
                        <img src="${p.url}" class="photo-thumb" onerror="this.src='https://via.placeholder.com/50?text=Error'">
                        <div style="flex:1; overflow:hidden;">
                            <div style="font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.name}">${p.name}</div>
                            <button class="copy-photo-btn copy-btn" data-url="${p.url}">Copy Image</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="instructions">
                <b>Tip:</b> Click "Copy Image" and then press <b>Ctrl+V</b> in the Jira Description to upload it instantly.
            </div>
        `;

        document.body.appendChild(assistant);

        assistant.querySelector('#close-assistant').onclick = () => assistant.remove();
        assistant.querySelector('#skip-photos').onclick = () => assistant.remove();

        // Handle copy image to clipboard
        assistant.querySelectorAll('.copy-photo-btn').forEach(btn => {
            btn.onclick = async () => {
                const url = btn.getAttribute('data-url');
                btn.textContent = 'Fetching...';
                try {
                    // Use background script to bypass CORS
                    const response = await chrome.runtime.sendMessage({
                        action: "fetchImage",
                        url: url
                    });

                    if (!response || !response.success) {
                        throw new Error(response?.error || "Failed to fetch image via background");
                    }

                    // For maximum compatibility, convert to PNG using a canvas
                    // This fixes the "application/octet-stream not supported" error
                    const blob = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas export failed")), 'image/png');
                        };
                        img.onerror = () => reject(new Error("Failed to load image for conversion"));
                        img.src = response.base64;
                    });

                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);

                    btn.textContent = 'Copied!';
                    btn.style.background = '#36b37e';
                    setTimeout(() => {
                        btn.textContent = 'Copy Image';
                        btn.style.background = '#0052CC';
                    }, 2000);
                } catch (err) {
                    console.error('JIRA_AUTOMATION: Failed to copy image:', err);
                    btn.textContent = 'Error';
                    btn.style.background = '#ff5630';
                }
            };
        });
    },

    /**
     * Handles complex Atlassian dropdowns (React-Select based)
     */
    async handleAtlassianSelect(labelName, targetValue) {
        console.log(`JIRA_AUTOMATION: Attempting to select ${labelName} -> ${targetValue}`);

        // Find the container by label
        const labels = Array.from(document.querySelectorAll('label'));
        const targetLabel = labels.find(l => l.innerText.includes(labelName));
        if (!targetLabel) {
            console.log(`JIRA_AUTOMATION: Label "${labelName}" not found.`);
            return;
        }

        const container = targetLabel.closest('div._1pfhu2gc') || targetLabel.parentElement;
        const input = container.querySelector('input');
        if (!input) {
            console.log(`JIRA_AUTOMATION: Input for "${labelName}" not found.`);
            return;
        }

        // Check if already selected
        const currentVal = container.innerText;
        if (currentVal.includes(targetValue)) {
            console.log(`JIRA_AUTOMATION: ${labelName} is already set correctly.`);
            return;
        }

        // Trigger dropdown
        input.focus();
        input.click();

        // Type the search
        await this.simulateTyping(input, targetValue);
        await new Promise(r => setTimeout(r, 1000)); // Wait for search results

        // Find the result in the dropdown list
        const options = Array.from(document.querySelectorAll('div[data-testid*="option"], .atlaskit-portal [role="option"], [id*="react-select-"]'));
        const targetOption = options.find(o => o.textContent.trim() === targetValue);

        if (targetOption) {
            console.log(`JIRA_AUTOMATION: Clicking option: ${targetValue}`);
            targetOption.click();
        } else {
            // Try searching more specifically for the text within options
            const bestMatch = options.find(o => o.textContent.toLowerCase().includes(targetValue.toLowerCase()));
            if (bestMatch) {
                console.log(`JIRA_AUTOMATION: Clicking best match option: ${bestMatch.textContent.trim()}`);
                bestMatch.click();
            } else if (options.length > 0) {
                console.log(`JIRA_AUTOMATION: Target option not found, clicking first match override.`);
                // This is risky, only do if we are sure
            }
        }
    },

    async fillFormField(labelName, value) {
        console.log(`JIRA_AUTOMATION: Filling field "${labelName}" with "${value}"`);
        const labels = Array.from(document.querySelectorAll('label'));
        const targetLabel = labels.find(l => l.innerText.trim().startsWith(labelName));

        let input = null;
        if (targetLabel) {
            const forId = targetLabel.getAttribute('for');
            if (forId) input = document.getElementById(forId);

            if (!input) {
                input = targetLabel.closest('div._1pfhu2gc')?.querySelector('input') ||
                    targetLabel.parentElement?.querySelector('input, textarea');
            }
        }

        // Fallback for custom fields by name/id
        if (!input) {
            if (labelName === 'Summary') input = document.querySelector('input[name="summary"], #summary-field');
            if (labelName === 'Customer Name') input = document.querySelector('[id^="customfield_10029"], [name="customfield_10029"]');
            if (labelName === 'Order Number') input = document.querySelector('[id^="customfield_10030"], [name="customfield_10030"]');
        }

        if (input) {
            await this.simulateTyping(input, value);
        } else {
            console.log(`JIRA_AUTOMATION: Could not find input for "${labelName}"`);
        }
    },

    async simulateTyping(element, text) {
        element.focus();
        element.click(); // Some fields need a click to activate

        // Clear value
        element.value = '';
        element.dispatchEvent(new Event('input', { bubbles: true }));

        // Set value and trigger events
        // Use native setter to bypass React 16+ overrides
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        const setter = (element.tagName === 'TEXTAREA') ? nativeTextAreaValueSetter : nativeInputValueSetter;

        if (setter) {
            setter.call(element, text);
        } else {
            element.value = text;
        }

        element.dispatchEvent(new InputEvent('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    },

    waitForElement(selector, timeout = 5000) {
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
};

JIRA_AUTOMATION.init();
