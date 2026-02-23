const https = require('https');

const API_KEY = 'REPLACE_WITH_YOUR_SHIPSTATION_API_KEY';

function testAuth(name, headers) {
    const options = {
        hostname: 'ssapi.shipstation.com',
        path: '/orders?page=1&pageSize=1',
        method: 'GET',
        headers: headers
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`[${name}] Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log(`[${name}] SUCCESS!`);
            } else {
                console.log(`[${name}] Failed. Response start: ${data.substring(0, 100)}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`[${name}] Error: ${e.message}`);
    });

    req.end();
}

// Method 1: Basic Auth with Key as Username
const basicAuth = Buffer.from(`${API_KEY}:`).toString('base64');
testAuth('Basic (Key:)', {
    'Authorization': `Basic ${basicAuth}`
});

// Method 2: Bearer Token
testAuth('Bearer', {
    'Authorization': `Bearer ${API_KEY}`
});

// Method 3: Raw API Key header (Some APIs use X-Api-Key)
testAuth('X-Api-Key', {
    'X-Api-Key': API_KEY
});
