require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const shopUrls = [process.env.SHOPIFY_SHOP_URL || 'your-shop-url.myshopify.com'];
const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-04';

const clientId = process.env.SHOPIFY_CLIENT_ID || 'your-client-id';
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || 'your-client-secret';
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || 'your-access-token';

async function testConfig(name, shopUrl, headers, auth) {
  const url = `https://${shopUrl}/admin/api/${apiVersion}/locations.json`;
  try {
    const config = { headers };
    if (auth) config.auth = auth;
    
    const response = await axios.get(url, config);
    console.log(`✅ SUCCESS [${name}] on ${shopUrl}: found ${response.data.locations?.length} locations`);
    return true;
  } catch (error) {
    console.log(`❌ FAILED [${name}] on ${shopUrl}: ${error.message} - ${JSON.stringify(error.response?.data || '')}`);
    return false;
  }
}

async function run() {
  for (const shopUrl of shopUrls) {
    console.log(`--- Testing shop: ${shopUrl} ---`);
    
    // 1. Standard custom app header
    await testConfig('Custom App Token Header', shopUrl, {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    });

    // 2. Bearer token
    await testConfig('Bearer Token Header', shopUrl, {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    });

    // 3. Basic auth: API Key (clientId) + Access Token
    await testConfig('Basic Auth (clientId:accessToken)', shopUrl, {
      'Content-Type': 'application/json'
    }, {
      username: clientId,
      password: accessToken
    });

    // 4. Basic auth: API Key (clientId) + Client Secret
    await testConfig('Basic Auth (clientId:clientSecret)', shopUrl, {
      'Content-Type': 'application/json'
    }, {
      username: clientId,
      password: clientSecret
    });

    // 5. Custom header with clientSecret
    await testConfig('X-Shopify-Access-Token with clientSecret', shopUrl, {
      'X-Shopify-Access-Token': clientSecret,
      'Content-Type': 'application/json'
    });
    
    console.log('\n');
  }
}

run();
