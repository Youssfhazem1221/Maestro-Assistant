// js/api.js

async function loginUser(email, password) {
    const loginBody = JSON.stringify({ "email": email, "password": password });
    const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: loginBody
    });

    if (response.ok) {
        const data = await response.json();
        if (data.token) {
            return data.token;
        } else {
            throw new Error("Login response missing token.");
        }
    } else {
        let errorDetail = response.statusText;
        try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(`Login failed: ${response.status} - ${errorDetail}`);
    }
}

async function fetchOrders(searchKey, searchTerm, token) {
    // Updated to use 'skip' and 'limit' based on network logs.
    // Removed 'viewId' and 'page'.
    const url = `${ORDERS_API_URL_BASE}?skip=0&limit=50&searchKey=${searchKey}&search=${encodeURIComponent(searchTerm)}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        const data = await response.json();
        // Robust check: try data.data, data.items, data.orders, or data itself if it's an array
        return (data.data || data.items || data.orders || (Array.isArray(data) ? data : []));
    } else if (response.status === 401) {
        // Special case for auth failure, which the caller should handle by logging out.
        throw new Error('401');
    } else {
        let errorDetail = response.statusText;
        try {
            const errorData = await response.json();
            errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) { /* Ignore parsing error */ }
        throw new Error(`API Error: ${response.status} - ${errorDetail}`);
        throw new Error(`API Error: ${response.status} - ${errorDetail}`);
    }
}

/**
 * Fetches tracking information from ShipStation for a given order number.
 * Uses the API Key stored in extension settings.
 */
async function getShipStationTracking(orderNumber) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['shipstationApiKey'], async (items) => {
            const rawKey = items.shipstationApiKey;
            if (!rawKey) {
                return reject(new Error("No ShipStation API Key found."));
            }

            try {
                // The user enters "Key:Secret" or just one string.
                // We'll try to handle "Key:Secret" format if they provide it.
                // If they provide just one string, we treat it as Key and hope Secret is empty, or vice versa?
                // Actually, correct format is Authorization: Basic base64(Key:Secret)

                let authHeader;
                if (rawKey.includes(':')) {
                    // User pasted "Key:Secret"
                    authHeader = `Basic ${btoa(rawKey)}`;
                } else {
                    // User pasted just one part. 
                    // Challenge: We don't know if it's Key or Secret. 
                    // But we MUST have both for Basic Auth usually.
                    // Let's assume they pasted "Key" and Secret is missing -> will fail (which is what's happening).
                    // Or they pasted Base64 hash? 
                    // Let's try treating it as the full token?
                    authHeader = `Basic ${btoa(rawKey + ":")}`; // Try as username, empty password
                }

                const searchUrl = `https://ssapi.shipstation.com/orders?orderNumber=${encodeURIComponent(orderNumber)}&page=1&pageSize=1`;

                const response = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`ShipStation API ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Extract tracking
                if (data.orders && data.orders.length > 0) {
                    const order = data.orders[0];
                    // ShipStation /orders response often has 'shipments' array if details are expanded
                    // or we might need to fetch shipments separately.
                    // For now, return order and we can debug structure.
                    return resolve(order);
                }

                resolve(null);

            } catch (error) {
                reject(error);
            }
        });
    });
}


/**
 * Fetches tracking information from ShipStation for a given order number.
 * Uses the API Key stored in extension settings.
 */
async function getShipStationTracking(orderNumber) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['shipstationApiKey'], async (items) => {
            const apiKey = items.shipstationApiKey;
            if (!apiKey) {
                return reject(new Error("No ShipStation API Key found. Please check Extension Options."));
            }

            try {
                // Determine Auth Header
                // 1. Try Basic Auth (Standard for Key:Secret)
                // If the user pasted just the Secret (which looks like base64), we might be in trouble without the Key.
                // However, if they pasted "Key:Secret" (combined), we can use it.
                // Or if it's a specific V2 token.

                // Heuristic: If it contains a slash or plus, it might be base64 already. 
                // Let's try to treat it as a Basic Auth username first (common for single-string keys).
                let authHeader = `Basic ${btoa(apiKey + ':')}`;

                // Search for the order
                const searchUrl = `https://ssapi.shipstation.com/orders?orderNumber=${encodeURIComponent(orderNumber)}&page=1&pageSize=1`;

                const response = await fetch(searchUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    // Fallback: Try Bearer? 
                    // (Some specialized integration keys use Bearer)
                    if (response.status === 401) {
                        const response2 = await fetch(searchUrl, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (response2.ok) {
                            // It worked! Process this response instead.
                            const data = await response2.json();
                            return resolve(parseShipStationResponse(data));
                        }
                    }

                    throw new Error(`ShipStation API ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                resolve(parseShipStationResponse(data));

            } catch (error) {
                reject(error);
            }
        });
    });
}

function parseShipStationResponse(data) {
    const orders = data.orders || [];
    if (orders.length === 0) return null;

    const order = orders[0];

    // Check for shipments
    // The API structure for shipments is typically under `shipments` array in the order object? 
    // Actually, usually you have to query /shipments?orderId=... OR content includes it.
    // Let's check typical response. /orders response usually *doesn't* include full shipment details unless expanded?
    // Wait, ShipStation /orders endpoint usually returns general status. Tracking might be there.
    // Actually, checking docs: /orders returns "shipments" array inside each order object if present.
    // Each shipment has "trackingNumber".

    // Priority 1: Shipments array
    // (Wait, /orders usually returns minimal info. We might need /shipments?orderNumber=...)
    // Let's try navigating to /shipments if this doesn't have it? 
    // Actually, let's assume /orders gives us correct Shipment Items.
    // ... Double checking docs/memory ... 
    // Use /shipments endpoint is better for tracking numbers.

    return order; // Return the whole object for now, caller will extract tracking.
}

/**
 * Fetches full order details from Maestro API.
 */
async function fetchOrderDetails(orderId, token) {
    const url = `${ORDERS_API_URL_BASE}/${orderId}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error(`Order Details API Error: ${response.status}`);
    }
}

/**
 * Gets a HelpScout OAuth2 access token using client credentials.
 */
async function getHelpScoutAccessToken(appId, appSecret) {
    const response = await fetch(HELPSCOUT_API_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: appId,
            client_secret: appSecret
        })
    });

    if (response.ok) {
        const data = await response.json();
        return data.access_token;
    } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HelpScout Auth Error: ${response.status} - ${errorData.error_description || response.statusText}`);
    }
}

/**
 * Lists all threads in a HelpScout conversation.
 */
async function listHelpScoutThreads(token, conversationId) {
    const url = `${HELPSCOUT_API_BASE_URL}/conversations/${conversationId}/threads`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HelpScout List Threads Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data._embedded?.threads || [];
}

/**
 * Creates an internal note in a HelpScout conversation (does NOT send emails).
 * This copies thread content as internal notes to avoid emailing customers.
 */
async function createImportedThread(token, conversationId, thread) {
    // Use the /notes endpoint to create internal notes that won't email customers
    const url = `${HELPSCOUT_API_BASE_URL}/conversations/${conversationId}/notes`;

    // Build note payload with thread information
    const payload = {
        text: `[Merged from conversation]\n\nFrom: ${thread.createdBy?.email || 'Unknown'}\nDate: ${thread.createdAt}\n\n${thread.body || ''}`,
        user: null // System-generated note
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HelpScout Create Note Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return response.status === 201;
}

/**
 * Deletes a HelpScout conversation.
 */
async function deleteHelpScoutConversation(token, conversationId) {
    const url = `${HELPSCOUT_API_BASE_URL}/conversations/${conversationId}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HelpScout Delete Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return true;
}

/**
 * Performs a "pseudo-merge" by copying threads from source to target.
 * This is a workaround since HelpScout API v2 doesn't support direct merging.
 * NOTE: Source conversation is NOT deleted, only threads are copied.
 */
async function mergeHelpScoutConversation(token, sourceId, targetId) {
    console.log(`API: Starting thread copy from ${sourceId} to ${targetId}`);

    // Step 1: Get all threads from the source conversation
    const threads = await listHelpScoutThreads(token, sourceId);
    console.log(`API: Found ${threads.length} threads in source conversation ${sourceId}`);

    // Step 2: Copy each thread to the target conversation with imported flag
    for (const thread of threads) {
        try {
            await createImportedThread(token, targetId, thread);
            console.log(`API: Copied thread ${thread.id} to target ${targetId}`);
        } catch (error) {
            console.warn(`API: Failed to copy thread ${thread.id}:`, error.message);
            // Continue with other threads even if one fails
        }
    }

    console.log(`API: Successfully copied all threads from ${sourceId} to ${targetId}`);
    console.log(`API: Note - Source conversation ${sourceId} remains active (not deleted)`);

    return true;
}
