// popup.js

// --- Configuration / Constants ---
// Fallbacks for UI helpers if not defined in config.js
if (typeof detailHeaders === 'undefined') {
    window.detailHeaders = [
        'Order Help', 'Shipment Status', 'Created Date', 'Model',
        'Variation: Color, Storage, Condition', 'Tracking ID', 'Tracking Link'
    ];
}
if (typeof headerToKeyMap === 'undefined') {
    window.headerToKeyMap = {
        'Order Help': 'Order Help',
        'Shipment Status': 'Shipment Status',
        'Created Date': 'Created Date',
        'Model': 'Model',
        'Variation: Color, Storage, Condition': 'Variation: Color, Storage, Condition',
        'Tracking ID': 'Tracking ID',
        'Tracking Link': 'Tracking Link'
    };
}


document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. Initialize Global DOM Elements (Required by ui.js) ---
    // We attach these to window so ui.js functions can access them if they rely on global scope
    window.loginSection = document.getElementById('login-section');
    window.loggedInStatus = document.getElementById('logged-in-status');
    window.searchSection = document.getElementById('search-section');
    window.fetchDataButton = document.getElementById('fetch-data-button');
    window.usernameInput = document.getElementById('username');
    window.passwordInput = document.getElementById('password');
    window.outputData = document.getElementById('output-data');
    window.outputDiv = document.getElementById('output-container');
    window.loggedInEmailSpan = document.getElementById('logged-in-email');

    // Local references
    const searchKeySelect = document.getElementById('search-key');
    const searchTermInput = document.getElementById('search-term');
    const logoutButton = document.getElementById('logout-button');
    const loginButton = document.getElementById('login-button');

    // Manual Token Elements (from your original popup.js)
    const tokenInput = document.getElementById('maestroToken');
    const saveBtn = document.getElementById('saveTokenBtn');
    const statusDiv = document.getElementById('tokenStatus');
    const optionsBtn = document.getElementById('openOptionsButton');

    // --- 2. Load State ---
    const stored = await chrome.storage.local.get(['maestroToken', 'maestroUserEmail']);

    // Populate Manual Token Input
    if (tokenInput && stored.maestroToken) {
        tokenInput.value = stored.maestroToken;
    }

    // Check Login Status and Update UI
    if (stored.maestroToken) {
        if (typeof updateUIAfterLogin === 'function') {
            updateUIAfterLogin(stored.maestroUserEmail || "User");
        }
    } else {
        if (typeof updateUIAfterLogout === 'function') {
            updateUIAfterLogout();
        }
    }

    // --- 3. Event Listeners ---

    // Manual Token Save
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const token = tokenInput ? tokenInput.value.trim() : '';
            if (token) {
                chrome.storage.local.set({ maestroToken: token }, () => {
                    if (statusDiv) {
                        statusDiv.textContent = "Token saved successfully!";
                        statusDiv.style.color = "green";
                        setTimeout(() => statusDiv.textContent = "", 2000);
                    }
                    // Treat manual token save as a login
                    if (typeof updateUIAfterLogin === 'function') {
                        updateUIAfterLogin("Manual Token User");
                    }
                });
            }
        });
    }

    // Open Options Page
    if (optionsBtn) {
        optionsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Login Button
    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            const email = usernameInput ? usernameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';

            if (!email || !password) {
                alert("Please enter email and password.");
                return;
            }

            try {
                // loginUser is defined in api.js
                const token = await loginUser(email, password);
                chrome.storage.local.set({ maestroToken: token, maestroUserEmail: email });
                updateUIAfterLogin(email);
            } catch (error) {
                console.error(error);
                alert("Login failed: " + error.message);
            }
        });
    }

    // Logout Button
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            chrome.storage.local.remove(['maestroToken', 'maestroUserEmail']);
            updateUIAfterLogout();
        });
    }

    // Search / Fetch Data Button
    if (fetchDataButton) {
        fetchDataButton.addEventListener('click', async () => {
            const searchKey = searchKeySelect ? searchKeySelect.value : 'order_number';
            const searchTerm = searchTermInput ? searchTermInput.value.trim() : '';

            if (!searchTerm) {
                if (typeof displayStatus === 'function') displayStatus("Please enter a search term.", "red");
                return;
            }

            if (typeof displayStatus === 'function') displayStatus("Searching...", "blue");

            try {
                const { maestroToken } = await chrome.storage.local.get('maestroToken');
                if (!maestroToken) {
                    throw new Error("No token found. Please login.");
                }

                // fetchOrders is defined in api.js
                const orders = await fetchOrders(searchKey, searchTerm, maestroToken);

                // Clear previous results
                if (window.outputData) window.outputData.innerHTML = '';

                if (orders && orders.length > 0) {
                    orders.forEach(order => {
                        // createOrderCard is defined in ui.js
                        createOrderCard(order, searchKey, searchTerm);
                    });
                    if (window.outputDiv) window.outputDiv.style.display = 'block';
                } else {
                    if (typeof displayStatus === 'function') displayStatus("No orders found.", "orange");
                }

            } catch (error) {
                console.error(error);
                if (error.message === '401') {
                    if (typeof displayStatus === 'function') displayStatus("Session expired. Please login again.", "red");
                    chrome.storage.local.remove(['maestroToken']);
                    updateUIAfterLogout();
                } else {
                    if (typeof displayStatus === 'function') displayStatus(`Error: ${error.message}`, "red");
                }
            }
        });
    }

    // Allow pressing "Enter" in the search box
    if (searchTermInput) {
        searchTermInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (fetchDataButton) fetchDataButton.click();
            }
        });
    }
});
