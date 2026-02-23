// options.js

// DOM Elements
const elements = {
    saveButton: document.getElementById('save-button'),
    statusEl: document.getElementById('status'),
    appIdInput: document.getElementById('helpscout-app-id'),
    appSecretInput: document.getElementById('helpscout-app-secret'),
    sheetsEnabledInput: document.getElementById('google-sheets-enabled'),
    spreadsheetIdInput: document.getElementById('google-spreadsheet-id'),
    testSyncBtn: document.getElementById('test-sync'),
    refreshLogsBtn: document.getElementById('refresh-logs'),
    exportLogsBtn: document.getElementById('export-logs'),
    clearLogsBtn: document.getElementById('clear-logs'),
    logsContainer: document.getElementById('logs-container'),
    // NEW: AI elements
    groqApiKeyInput: document.getElementById('groq-api-key'),
    testGroqBtn: document.getElementById('test-groq-api'),
    groqStatus: document.getElementById('groq-status')
};

function setStatus(message, isError = false) {
    if (!elements.statusEl) return;
    elements.statusEl.textContent = message;
    elements.statusEl.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
    setTimeout(() => { if (elements.statusEl) elements.statusEl.textContent = ''; }, 3000);
}

// Load Settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get([
        'helpscoutAppId',
        'helpscoutAppSecret',
        'googleSheetsSyncEnabled',
        'googleSpreadsheetId',
        'groqApiKey'
    ], (items) => {
        if (elements.appIdInput && items.helpscoutAppId) elements.appIdInput.value = items.helpscoutAppId;
        if (elements.appSecretInput && items.helpscoutAppSecret) elements.appSecretInput.value = items.helpscoutAppSecret;
        if (elements.sheetsEnabledInput) elements.sheetsEnabledInput.checked = !!items.googleSheetsSyncEnabled;
        if (elements.spreadsheetIdInput && items.googleSpreadsheetId) elements.spreadsheetIdInput.value = items.googleSpreadsheetId;
        if (elements.groqApiKeyInput && items.groqApiKey) elements.groqApiKeyInput.value = items.groqApiKey;
    });

    // Initial refresh of logs
    refreshLogs();
});

// Save Settings
if (elements.saveButton) {
    elements.saveButton.addEventListener('click', () => {
        const appId = elements.appIdInput?.value.trim() || '';
        const appSecret = elements.appSecretInput?.value.trim() || '';
        const sheetsEnabled = elements.sheetsEnabledInput?.checked || false;
        const spreadsheetId = elements.spreadsheetIdInput?.value.trim() || '';
        const groqApiKeyValue = elements.groqApiKeyInput?.value.trim() || '';

        chrome.storage.local.set({
            helpscoutAppId: appId,
            helpscoutAppSecret: appSecret,
            googleSheetsSyncEnabled: sheetsEnabled,
            googleSpreadsheetId: spreadsheetId,
            groqApiKey: groqApiKeyValue
        }, () => {
            setStatus('Settings saved!');
        });
    });
}

// Test Groq API
if (elements.testGroqBtn) {
    elements.testGroqBtn.addEventListener('click', () => {
        if (elements.groqStatus) {
            elements.groqStatus.textContent = 'Testing connection...';
            elements.groqStatus.style.color = '#60a5fa';
        }

        // Save the key first before testing
        const groqApiKeyValue = elements.groqApiKeyInput?.value.trim() || '';
        chrome.storage.local.set({ groqApiKey: groqApiKeyValue }, () => {
            chrome.runtime.sendMessage({ action: 'testGroqAPI' }, (response) => {
                if (!elements.groqStatus) return;

                if (response && response.success) {
                    elements.groqStatus.textContent = `Success: "${response.reply}"`;
                    elements.groqStatus.style.color = 'var(--success-color)';
                } else {
                    const errorMsg = response?.error || chrome.runtime.lastError?.message || 'Unknown error';
                    elements.groqStatus.textContent = `Error: ${errorMsg}`;
                    elements.groqStatus.style.color = 'var(--error-color)';
                }
            });
        });
    });
}

// Google Sheets Sync Now
if (elements.testSyncBtn) {
    elements.testSyncBtn.addEventListener('click', () => {
        setStatus('Attempting sync to Google Sheets...');
        chrome.runtime.sendMessage({ action: 'SYNC_LOGS_NOW' }, (response) => {
            if (response && response.success) {
                setStatus('Sync successful! Logs appended to Sheet.');
            } else {
                const errorMsg = response?.error || 'Unknown error';
                setStatus(`Sync failed: ${errorMsg}`, true);
            }
        });
    });
}

// Activity Log Rendering
async function refreshLogs() {
    if (!elements.logsContainer) return;

    const { activity_logs = [] } = await chrome.storage.local.get('activity_logs');
    if (activity_logs.length === 0) {
        elements.logsContainer.innerHTML = '<em>No logs found.</em>';
        return;
    }

    elements.logsContainer.innerHTML = activity_logs.slice(-100).reverse().map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const details = JSON.stringify(log.details, null, 2);
        return `<div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">
            <span style="color: #666;">[${time}]</span> 
            <strong style="color: #007bff;">${log.type}</strong> 
            <span style="color: #28a745;">${log.source}</span>
            <div style="color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.url}">${log.url}</div>
            <pre style="margin: 4px 0 0 0; background: #eee; padding: 4px; font-size: 10px;">${details}</pre>
        </div>`;
    }).join('');
}

if (elements.refreshLogsBtn) {
    elements.refreshLogsBtn.addEventListener('click', refreshLogs);
}

// Export to JSON
if (elements.exportLogsBtn) {
    elements.exportLogsBtn.addEventListener('click', async () => {
        const { activity_logs = [] } = await chrome.storage.local.get('activity_logs');
        const blob = new Blob([JSON.stringify(activity_logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `maestro-activity-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Clear Logs
if (elements.clearLogsBtn) {
    elements.clearLogsBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all activity logs?')) {
            await chrome.storage.local.remove('activity_logs');
            refreshLogs();
            setStatus('Logs cleared!');
        }
    });
}
