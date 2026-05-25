require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const shopUrl = process.env.SHOPIFY_SHOP_URL || 'your-shop-url.myshopify.com';
const clientId = process.env.SHOPIFY_CLIENT_ID || 'your-client-id';
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || 'your-client-secret';

async function requestToken() {
  const url = `https://${shopUrl}/admin/oauth/access_token`;
  console.log(`📡 Requesting access token from ${url} using Client Credentials Grant...`);
  
  try {
    const response = await axios.post(url, {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Access Token successfully retrieved!');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data.access_token;
  } catch (error) {
    if (error.response) {
      console.log(`❌ Failed: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`❌ Failed: ${error.message}`);
    }
    return null;
  }
}

requestToken();
