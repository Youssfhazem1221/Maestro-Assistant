// background.js
importScripts('js/config.js', 'js/api.js');

// --- CONSTANTS for target apps ---
const MAESTRO_BASE_URL = "https://maestro.smyleteam.com/orders";
const MAESTRO_CUSTOMERS_URL = "https://maestro.smyleteam.com/customers";
const SHIPSTATION_SEARCH_URL = "https://ship11.shipstation.com/orders/all-orders-search-result?quickSearch=";
const STRIPE_SEARCH_URL = "https://dashboard.stripe.com/acct_1DzyweL9CpjBwf6R/search?query=";
const GIDDYUP_SEARCH_URL = "https://partner.giddyup.io/1420/orders?email=";
const GIDDYUP_NAME_SEARCH_URL = "https://partner.giddyup.io/1420/orders?page=1&customer_name=";


// --- Default Training Data (Hardcoded) ---
// Edit these sections to "train" the AI's default behavior
const DEFAULT_RULES = `
Be polite, professional, and concise. 
Do not make up information not present in the context.
`;

const DEFAULT_EXAMPLES = `
Input: Where is my order?
Output: Hi! I've checked your order and it is currently being processed. You will receive a tracking link soon.
`;

// --- Function to create context menus ---
function createContextMenus() {
    if (!chrome.contextMenus) {
        return;
    }

    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "searchMaestroWithSelection",
            title: "Search Maestro CRM for: \"%s\"",
            contexts: ["selection"]
        });

        console.log("BACKGROUND: Context menus creation attempted.");
    });
}

chrome.runtime.onInstalled.addListener((details) => {
    createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
    createContextMenus();
});

async function navigateAndSearchMaestro(searchTerm, openInBackground = false) {
    console.log(`BACKGROUND: Searching Maestro for: "${searchTerm}"`);
    try {
        const tabs = await chrome.tabs.query({ url: "*://*.smyleteam.com/*" });
        let targetTab = null;
        if (tabs.length > 0) {
            const windowTabs = tabs.filter(t => t.windowId === chrome.windows.WINDOW_ID_CURRENT);
            targetTab = windowTabs.length > 0 ? windowTabs[0] : tabs[0];
        }

        if (targetTab) {
            console.log("BACKGROUND: Found existing Maestro tab. Sending zero-reload search message.");
            if (!openInBackground) {
                await chrome.tabs.update(targetTab.id, { active: true });
                await chrome.windows.update(targetTab.windowId, { focused: true });
            }
            chrome.tabs.sendMessage(targetTab.id, { action: 'EXECUTE_CRM_SEARCH', query: searchTerm });
        } else {
            console.log("BACKGROUND: No Maestro tab found, opening new one.");
            await chrome.storage.local.set({ 'pendingMaestroSearch': searchTerm });
            await chrome.tabs.create({ url: MAESTRO_BASE_URL, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND:", error);
    }
}

async function navigateAndSearchMaestroCustomer(searchTerm, openInBackground = false) {
    console.log(`BACKGROUND: Searching Maestro Customers for: "${searchTerm}"`);
    try {
        const tabs = await chrome.tabs.query({ url: "*://*.smyleteam.com/*" });
        let targetTab = null;
        if (tabs.length > 0) {
            const windowTabs = tabs.filter(t => t.windowId === chrome.windows.WINDOW_ID_CURRENT);
            targetTab = windowTabs.length > 0 ? windowTabs[0] : tabs[0];
        }

        if (targetTab) {
            if (!openInBackground) {
                await chrome.tabs.update(targetTab.id, { active: true });
                await chrome.windows.update(targetTab.windowId, { focused: true });
            }
            chrome.tabs.sendMessage(targetTab.id, { action: 'EXECUTE_CRM_SEARCH', query: searchTerm });
        } else {
            await chrome.storage.local.set({ 'pendingMaestroCustomerSearch': searchTerm });
            await chrome.tabs.create({ url: MAESTRO_CUSTOMERS_URL, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND:", error);
    }
}

async function navigateToMaestroOrder(orderId, openInBackground = false) {
    const orderUrl = `https://maestro.smyleteam.com/orders/${orderId}`;
    console.log("BACKGROUND: Navigating to Maestro order:", orderUrl);

    try {
        const tabs = await chrome.tabs.query({ url: "*://*.smyleteam.com/*" });
        let targetTab = null;
        if (tabs.length > 0) {
            const windowTabs = tabs.filter(t => t.windowId === chrome.windows.WINDOW_ID_CURRENT);
            targetTab = windowTabs.length > 0 ? windowTabs[0] : tabs[0];
        }

        if (targetTab) {
            await chrome.tabs.update(targetTab.id, { url: orderUrl, active: !openInBackground });
            if (!openInBackground) {
                await chrome.windows.update(targetTab.windowId, { focused: true });
            }
        } else {
            await chrome.tabs.create({ url: orderUrl, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND: Error in navigateToMaestroOrder:", error);
    }
}

async function navigateAndSearchShipStation(searchTerm, openInBackground = false) {
    console.log(`BACKGROUND: Searching ShipStation for: "${searchTerm}"`);
    const searchUrl = SHIPSTATION_SEARCH_URL + encodeURIComponent(searchTerm);

    try {
        const tabs = await chrome.tabs.query({ url: "https://*.shipstation.com/*" });

        if (tabs.length > 0) {
            const tab = tabs[0];
            const tabId = tab.id;

            if (!openInBackground) {
                await chrome.tabs.update(tabId, { active: true });
                await chrome.windows.update(tab.windowId, { focused: true });
            }

            // Zero-reload instant messaging for ShipStation
            chrome.tabs.sendMessage(tabId, { action: 'EXECUTE_SHIPSTATION_SEARCH', query: searchTerm }, (response) => {
                if (chrome.runtime.lastError || !response || !response.success) {
                    console.log("BACKGROUND: Messaging failed, falling back to URL update.");
                    chrome.tabs.update(tabId, { url: searchUrl });
                }
            });
        } else {
            await chrome.tabs.create({ url: searchUrl, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND: Error in navigateAndSearchShipStation:", error);
    }
}

async function navigateAndSearchStripe(searchTerm, openInBackground = false) {
    console.log(`BACKGROUND: Searching Stripe for: "${searchTerm}"`);
    const searchUrl = STRIPE_SEARCH_URL + encodeURIComponent(searchTerm);

    try {
        const tabs = await chrome.tabs.query({ url: "https://dashboard.stripe.com/*" });

        if (tabs.length > 0) {
            const tab = tabs[0];
            const tabId = tab.id;

            // 1. Bring tab to front
            if (!openInBackground) {
                await chrome.tabs.update(tabId, { active: true });
            }

            // 2. Try to inject search directly (Instant, no reload)
            let injected = false;
            try {
                const response = await chrome.tabs.sendMessage(tabId, {
                    action: "performStripeSearch",
                    searchTerm: searchTerm
                });
                if (response && response.success) {
                    injected = true;
                    console.log("BACKGROUND: Stripe search injected via DOM.");
                }
            } catch (e) {
                // Ignore error, proceed to fallback
            }

            if (!injected) {
                // 3. Fallback: If content script isn't ready, reload the page (Old method)
                console.log("BACKGROUND: Stripe script not ready or failed, reloading page.");
                await chrome.tabs.update(tabId, { url: searchUrl });
            }
        } else {
            // Create new tab
            const newTab = await chrome.tabs.create({ url: searchUrl, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND: Error in navigateAndSearchStripe:", error);
    }
}

async function navigateAndSearchGiddyUp(searchTerm, openInBackground = false) {
    console.log(`BACKGROUND: Searching GiddyUp for: "${searchTerm}"`);
    const searchUrl = GIDDYUP_SEARCH_URL + encodeURIComponent(searchTerm) + "&page=1";

    try {
        const tabs = await chrome.tabs.query({ url: "https://partner.giddyup.io/*" });

        if (tabs.length > 0) {
            const tab = tabs[0];
            const tabId = tab.id;

            if (!openInBackground) {
                await chrome.tabs.update(tabId, { active: true });
            }
            await chrome.tabs.update(tabId, { url: searchUrl });
        } else {
            await chrome.tabs.create({ url: searchUrl, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND: Error in navigateAndSearchGiddyUp:", error);
    }
}

async function navigateAndSearchGiddyUpName(searchTerm, openInBackground = false) {
    console.log(`BACKGROUND: Searching GiddyUp (Name) for: "${searchTerm}"`);
    const searchUrl = GIDDYUP_NAME_SEARCH_URL + encodeURIComponent(searchTerm);

    try {
        const tabs = await chrome.tabs.query({ url: "https://partner.giddyup.io/*" });

        if (tabs.length > 0) {
            const tab = tabs[0];
            const tabId = tab.id;

            if (!openInBackground) {
                await chrome.tabs.update(tabId, { active: true });
            }
            await chrome.tabs.update(tabId, { url: searchUrl });
        } else {
            await chrome.tabs.create({ url: searchUrl, active: !openInBackground });
        }
    } catch (error) {
        console.error("BACKGROUND: Error in navigateAndSearchGiddyUpName:", error);
    }
}

async function navigateAndSearchClaimsApp(searchTerm) {
    console.log(`BACKGROUND: Opening Claims App. Search term (manual): "${searchTerm}"`);
    // Open the Claims App View. AppSheet deep linking for search is complex, so we open the main view.
    const url = CLAIMS_APP_TARGET_VIEW_URL;
    try {
        await chrome.tabs.create({ url: url, active: true });
    } catch (error) {
        console.error("BACKGROUND: Error in navigateAndSearchClaimsApp:", error);
    }
}


// --- Handle Messages from Content Scripts & Context Menu Clicks ---
if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "generateSuggestion") {
            sendResponse({ success: false, error: "AI Assistant is disabled." });
            return true;
        } else if (request.action === "searchMaestroApp") {
            navigateAndSearchMaestro(request.searchTerm, request.openInBackground);
            return true;
        } else if (request.action === "searchMaestroSmart") {
            (async () => {
                const { email, name, openInBackground } = request;
                console.log(`BACKGROUND: Smart Maestro Search for Email: ${email}, Name: ${name}`);

                try {
                    const tabs = await chrome.tabs.query({ url: "*://*.smyleteam.com/*" });
                    let targetTab = null;
                    if (tabs.length > 0) {
                        targetTab = tabs[0];
                    }

                    if (targetTab) {
                        if (!openInBackground) {
                            await chrome.tabs.update(targetTab.id, { active: true });
                            await chrome.windows.update(targetTab.windowId, { focused: true });
                        }
                        chrome.tabs.sendMessage(targetTab.id, {
                            action: 'EXECUTE_SMART_MAESTRO_SEARCH',
                            email: email,
                            name: name
                        });
                    } else {
                        // Pass both to storage for the new tab to pick up
                        await chrome.storage.local.set({
                            'pendingSmartMaestroSearch': { email, name }
                        });
                        await chrome.tabs.create({ url: MAESTRO_BASE_URL, active: !openInBackground });
                    }
                } catch (error) {
                    console.error("BACKGROUND:", error);
                }
            })();
            return true;
        } else if (request.action === "searchMaestroCustomer") {
            navigateAndSearchMaestroCustomer(request.searchTerm, request.openInBackground);
            return true;
        } else if (request.action === "searchShipStation") {
            if (request.searchTerm) {
                navigateAndSearchShipStation(request.searchTerm, request.openInBackground);
            }
        } else if (request.action === "searchStripe") {
            if (request.searchTerm) {
                navigateAndSearchStripe(request.searchTerm, request.openInBackground);
            }
        } else if (request.action === "searchGiddyUp") {
            if (request.searchTerm) {
                navigateAndSearchGiddyUp(request.searchTerm, request.openInBackground);
            }
        } else if (request.action === "searchGiddyUpName") {
            if (request.searchTerm) {
                navigateAndSearchGiddyUpName(request.searchTerm, request.openInBackground);
            }
        } else if (request.action === "searchClaimsApp") {
            if (request.searchTerm) {
                navigateAndSearchClaimsApp(request.searchTerm);
            }
        } else if (request.action === "searchAllApps") {
            // Trigger all searches simultaneously
            if (request.searchTerm) {
                navigateAndSearchMaestro(request.searchTerm, request.openInBackground);
                navigateAndSearchShipStation(request.searchTerm, request.openInBackground);
                navigateAndSearchStripe(request.searchTerm, request.openInBackground);
            }
        } else if (request.action === "searchSmartSync") {
            // --- NEW: SMART SYNC SEARCH (Renamed from Magic Search) ---
            (async () => {
                const query = request.searchTerm;
                console.log('BACKGROUND: Initiating cross-tab search for', query);

                try {
                    const tabs = await chrome.tabs.query({});
                    let maestroFound = false;
                    let shipstationFound = false;

                    for (const t of tabs) {
                        const tUrl = t.url || '';
                        if (tUrl.includes('maestro.smyleteam.com')) {
                            maestroFound = true;
                            // Bring Maestro to front
                            await chrome.tabs.update(t.id, { active: true });
                            await chrome.windows.update(t.windowId, { focused: true });

                            // Let the maestro content script know
                            chrome.tabs.sendMessage(t.id, { action: 'EXECUTE_CRM_SEARCH', query });
                        }
                        if (tUrl.includes('shipstation.com')) {
                            shipstationFound = true;
                            chrome.tabs.sendMessage(t.id, { action: 'EXECUTE_SHIPSTATION_SEARCH', query });
                        }
                    }

                    let msg = `Searching across tabs for "${query}".`;
                    if (!maestroFound) msg += " (Maestro CRM not open)";
                    if (!shipstationFound) msg += " (ShipStation not open)";

                    sendResponse({ success: true, message: msg });
                } catch (e) {
                    console.error("BACKGROUND Error in CrossTab Search:", e);
                    sendResponse({ success: false, error: e.message });
                }
            })();
            return true;
        } else if (request.action === "testApiKey") {
            (async () => {
                try {
                    const { groqApiKey } = await chrome.storage.local.get('groqApiKey');

                    if (!groqApiKey || groqApiKey === "gsk_...") {
                        throw new Error("Please save a valid API Key first.");
                    }

                    const response = await fetch(GROQ_API_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${groqApiKey}`
                        },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: [{ role: "user", content: "Test connection" }],
                            max_tokens: 1
                        }),
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        const errMsg = errData.error?.message || response.statusText;
                        throw new Error(`API Error (${response.status}): ${errMsg}`);
                    }

                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;
        } else if (request.action === "testGroqAPI" || request.action === "summarizeWithGroq") {
            // --- NEW: GROQ API TEST & SUMMARIZE ---
            (async () => {
                try {
                    const { groqApiKey } = await chrome.storage.local.get('groqApiKey');
                    // Use user's key or fallback to default
                    const keyToUse = groqApiKey || "REPLACE_WITH_YOUR_GROQ_API_KEY";

                    if (!keyToUse) {
                        throw new Error("No Groq API Key available.");
                    }

                    const messages = request.action === "testGroqAPI"
                        ? [{ role: "user", content: "Say 'Connection Successful! Maestro is ready.' and nothing else." }]
                        : [
                            { role: "system", content: "You are a helpful customer service assistant for Smyle/Shiny Smile Veneers. Summarize the following ticket thread in 2-3 concise bullet points focusing on the customer's core issue and current status." },
                            { role: "user", content: request.text }
                        ];

                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${keyToUse}`
                        },
                        body: JSON.stringify({
                            model: 'llama-3.3-70b-versatile',
                            messages: messages,
                            max_tokens: 250
                        }),
                    });

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        const errMsg = errData.error?.message || response.statusText;
                        throw new Error(`Groq API Error (${response.status}): ${errMsg}`);
                    }

                    const data = await response.json();
                    sendResponse({
                        success: true,
                        reply: data.choices[0].message.content
                    });
                } catch (error) {
                    console.error("BACKGROUND Groq API Error:", error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;
        } else if (request.action === "fetchTrackingInfo") {
            sendResponse({ success: true, data: { tracking: [], errors: ["API tracking is disabled."] } });
            return true;
        } else if (request.action === "fetchImage") {
            (async () => {
                try {
                    const response = await fetch(request.url);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                    const blob = await response.blob();

                    // Convert blob to base64 to send it through message channel
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        sendResponse({ success: true, base64: reader.result, contentType: blob.type });
                    };
                    reader.onerror = () => sendResponse({ success: false, error: "Base64 conversion failed" });
                    reader.readAsDataURL(blob);
                } catch (err) {
                    console.error("BACKGROUND: Failed to fetch image:", err);
                    sendResponse({ success: false, error: err.message });
                }
            })();
            return true;
        } else if (request.action === "mergeHelpScoutConversations") {
            (async () => {
                console.log("BACKGROUND: Received mergeHelpScoutConversations request.");
                try {
                    const { helpscoutAppId, helpscoutAppSecret } = await chrome.storage.local.get(['helpscoutAppId', 'helpscoutAppSecret']);
                    if (!helpscoutAppId || !helpscoutAppSecret) {
                        console.warn("BACKGROUND: HelpScout credentials missing in storage.");
                        throw new Error("HelpScout API credentials not found. Please configure them in extension options.");
                    }

                    console.log("BACKGROUND: Fetching HelpScout access token...");
                    const token = await getHelpScoutAccessToken(helpscoutAppId, helpscoutAppSecret);
                    console.log("BACKGROUND: Access token acquired.");

                    const { sourceIds, targetId } = request.data;
                    console.log(`BACKGROUND: Starting pseudo-merge of ${sourceIds.length} sources into ${targetId}`);
                    console.log("BACKGROUND: Note - Using workaround (copy threads + delete source) since HelpScout API doesn't support direct merging.");

                    for (const sourceId of sourceIds) {
                        if (sourceId === targetId) {
                            console.log(`BACKGROUND: Skipping self-merge for ID ${sourceId}`);
                            continue;
                        }
                        console.log(`BACKGROUND: Processing merge: ${sourceId} -> ${targetId}`);
                        await mergeHelpScoutConversation(token, sourceId, targetId);
                        console.log(`BACKGROUND: Successfully merged conversation ${sourceId}`);
                    }

                    console.log("BACKGROUND: All merges completed successfully.");
                    sendResponse({ success: true });
                } catch (error) {
                    console.error("BACKGROUND: HelpScout merge failed:", error);
                    sendResponse({ success: false, error: error.message });
                }
            })();
            return true;
        } else if (request.action === "LOG_ACTIVITY") {
            (async () => {
                const MAX_LOCAL_LOGS = 10000;
                const SYNC_THRESHOLD = 50;
                const { activity_logs = [], googleSheetsSyncEnabled, googleSpreadsheetId } = await chrome.storage.local.get(['activity_logs', 'googleSheetsSyncEnabled', 'googleSpreadsheetId']);

                activity_logs.push(request.data);

                if (activity_logs.length > MAX_LOCAL_LOGS) {
                    activity_logs.splice(0, activity_logs.length - MAX_LOCAL_LOGS);
                }

                await chrome.storage.local.set({ activity_logs });

                // Sync logic
                if (googleSheetsSyncEnabled && googleSpreadsheetId && activity_logs.length % SYNC_THRESHOLD === 0) {
                    syncToGoogleSheets(activity_logs.slice(-SYNC_THRESHOLD));
                }
            })();
            return true;
        } else if (request.action === "SYNC_LOGS_NOW") {
            (async () => {
                const { activity_logs = [] } = await chrome.storage.local.get('activity_logs');
                const result = await syncToGoogleSheets(activity_logs);
                if (result === true) {
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: result.error });
                }
            })();
            return true;
        } else if (request.action === "EXPORT_ACTIVITY_SMART") {
            (async () => {
                const { activity_logs = [] } = await chrome.storage.local.get('activity_logs');
                if (activity_logs.length === 0) {
                    sendResponse({ success: false, error: "No logs found to export." });
                    return;
                }

                // Create CSV Header
                const headers = ["Timestamp", "Type", "Source", "URL", "Title", "Details"];
                const rows = activity_logs.map(log => [
                    log.timestamp || "",
                    log.type || "",
                    log.source || "",
                    log.url || "",
                    (log.title || "").replace(/"/g, '""'),
                    JSON.stringify(log.details || {}).replace(/"/g, '""')
                ]);

                const csvContent = [
                    headers.join(","),
                    ...rows.map(r => r.map(cell => `"${cell}"`).join(","))
                ].join("\n");

                sendResponse({ success: true, csv: csvContent });
            })();
            return true;
        }
    });
}

/**
 * Syncs logs to Google Sheets
 */
async function syncToGoogleSheets(logs) {
    if (!logs || logs.length === 0) return false;
    try {
        const { googleSpreadsheetId } = await chrome.storage.local.get('googleSpreadsheetId');
        if (!googleSpreadsheetId) return false;

        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(token);
            });
        });

        const values = logs.map(log => [
            log.timestamp,
            log.type,
            log.source,
            log.url,
            log.title,
            JSON.stringify(log.details)
        ]);

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${googleSpreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || response.statusText);
        }
        return true;
    } catch (error) {
        console.error("Sheets sync failed:", error);
        return { error: error.message };
    }
}

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId === "searchMaestroWithSelection" && info.selectionText) {
            navigateAndSearchMaestro(info.selectionText.trim());
        }
    });
} else {
    console.error("BACKGROUND: chrome.contextMenus.onClicked is not available. Check permissions.");
}
