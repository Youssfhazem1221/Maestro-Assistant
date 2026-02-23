// js/ui.js

function setDarkMode(isDarkMode) {
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [DARK_MODE_KEY]: isDarkMode ? 'dark' : 'light' });
    }
}

function displayStatus(message, color = 'inherit', inOutputArea = true) {
    const targetDiv = inOutputArea ? outputData : null;
    const cssColor = (typeof color === 'string' && color.match(/^[a-zA-Z]+$/)) ? `var(--${color}-color, ${color})` : color;
    if (targetDiv) {
        if (inOutputArea && outputData) {
            outputData.innerHTML = '';
            const statusP = document.createElement('p');
            statusP.textContent = message;
            statusP.style.textAlign = 'center';
            statusP.style.color = cssColor;
            outputData.appendChild(statusP);
            if (outputDiv) outputDiv.style.display = 'block';
        }
    }
}

function updateUIAfterLogin(userEmail) {
    if (loginSection) loginSection.style.display = 'none';
    if (loggedInStatus) loggedInStatus.style.display = 'block';
    if (searchSection) searchSection.style.display = 'block';
    if (fetchDataButton) fetchDataButton.disabled = false;
    if (loggedInEmailSpan) loggedInEmailSpan.textContent = userEmail;
}

function updateUIAfterLogout() {
    if (loggedInStatus) loggedInStatus.style.display = 'none';
    if (searchSection) searchSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';
    if (fetchDataButton) fetchDataButton.disabled = true;
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (outputData) outputData.innerHTML = '';
    if (outputDiv) outputDiv.style.display = 'none';
    displayStatus('Logged out.', 'gray');
}

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

function createOrderCard(orderProduct, searchKey, searchTerm) {
    if (!outputData) return;
    const card = document.createElement('div'); card.className = 'order-card';
    const summary = document.createElement('div'); summary.className = 'card-summary';
    let trVal = orderProduct['Tracking Link'] || 'N/A', trHTML = trVal;
    if (trVal !== 'N/A' && typeof trVal === 'string' && trVal.startsWith('http')) trHTML = `<a href="${trVal}" target="_blank" rel="noopener noreferrer">${trVal}</a>`; else trHTML = 'N/A';
    let sL = 'Search Term'; if (searchKey === 'customer_email') sL = 'Email'; else if (searchKey === 'order_number') sL = 'Order#'; else if (searchKey === 'customer_contact') sL = 'Phone#';
    summary.innerHTML = `<h4>ID: ${orderProduct['id'] || 'N/A'} <span class="search-term-display">(${sL}: ${searchTerm})</span></h4><p><strong>Model:</strong> ${orderProduct['Model'] || 'N/A'}</p><p><strong>Variation:</strong> ${orderProduct['Variation: Color, Storage, Condition'] || 'N/A'}</p><p><strong>Created:</strong> ${orderProduct['Created Date'] || 'N/A'}</p><p><strong>Status:</strong> ${orderProduct['Shipment Status'] || 'N/A'}</p><p><strong>Order number:</strong> ${orderProduct['Order Help'] || 'N/A'}</p><p><strong>Tracking ID:</strong> ${orderProduct['Tracking ID'] || 'N/A'}</p><p><strong>Tracking Link:</strong> <span class="tracking-link-display">${trHTML}</span></p>`;
    card.appendChild(summary);
    const actDiv = document.createElement('div'); actDiv.style.marginTop = '10px';
    const detBtn = document.createElement('button'); detBtn.className = 'details-button'; detBtn.textContent = 'View Full Details'; detBtn.onclick = () => openDetailsInNewTab(orderProduct); actDiv.appendChild(detBtn);
    if (trVal !== 'N/A' && typeof trVal === 'string' && trVal.startsWith('http')) {
        const cpyBtn = document.createElement('button'); cpyBtn.textContent = 'Copy Tracking'; cpyBtn.className = 'copy-tracking-button';
        cpyBtn.addEventListener('click', (e) => { e.stopPropagation(); navigator.clipboard.writeText(trVal).then(() => { showCopiedTooltip(e.clientX, e.clientY); cpyBtn.textContent = 'Copied!'; cpyBtn.style.backgroundColor = '#28a745'; setTimeout(() => { cpyBtn.textContent = 'Copy Tracking'; cpyBtn.style.backgroundColor = ''; }, 2000); }).catch(err => { console.error('Copy failed:', err); alert('Failed to copy.'); }); });
        actDiv.appendChild(cpyBtn);
    }
    if (actDiv.hasChildNodes()) card.appendChild(actDiv);
    outputData.appendChild(card);
}

function openDetailsInNewTab(orderProduct) {
    const nT = window.open('', '_blank'); if (!nT) { alert("Popup blocked!"); return; }
    const iDMA = document.body.classList.contains('dark-mode');
    const nTS = `body{font-family:Arial,sans-serif;padding:20px;background-color:${iDMA ? '#1e1e1e' : '#fff'};color:${iDMA ? '#e0e0e0' : '#333'}}h1{color:purple;border-bottom:1px solid ${iDMA ? '#555' : '#ccc'};padding-bottom:10px}table{border-collapse:collapse;width:100%;margin-top:15px}th,td{border:1px solid ${iDMA ? '#444' : '#ddd'};padding:8px;text-align:left;vertical-align:top;word-wrap:break-word}th{background-color:${iDMA ? '#2a2a2a' : '#f2f2f2'};width:200px;color:${iDMA ? '#d0d0d0' : '#333'}}tr:nth-child(even){background-color:${iDMA ? '#222' : '#f9f9f9'}}a{color:${iDMA ? '#4dabf5' : '#007BFF'};text-decoration:none}a:hover{text-decoration:underline;color:${iDMA ? '#64b5f6' : '#0056b3'}}`;
    nT.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Order Details - ID: ${orderProduct.id || 'N/A'}</title><style>${nTS}</style></head><body><h1>Order Details</h1><h2>ID: ${orderProduct.id || 'N/A'}</h2><table><tbody>`);
    detailHeaders.forEach(h => { const k = headerToKeyMap[h]; let v = k ? (orderProduct[k] ?? 'N/A') : 'N/A'; if ((k === 'Tracking Link' || k === 'Tracking Label Link') && typeof v === 'string' && v.startsWith('http')) v = `<a href="${v}" target="_blank" rel="noopener noreferrer">${v}</a>`; nT.document.write(`<tr><th>${h}</th><td>${v}</td></tr>`); });
    nT.document.write(`</tbody></table></body></html>`); nT.document.close();
}