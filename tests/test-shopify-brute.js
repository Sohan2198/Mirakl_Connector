const axios = require('axios');

const shopUrl = 'hairdrama-us.myshopify.com';
const baseToken = '2aa808babeba09a0de6eeb3241de7f8';
const apiVersion = '2024-01';

async function testToken(token) {
  const url = `https://${shopUrl}/admin/api/${apiVersion}/locations.json`;
  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      }
    });
    return { success: true, locationsCount: response.data.locations?.length };
  } catch (error) {
    return { success: false, status: error.response?.status, data: error.response?.data };
  }
}

async function run() {
  const hexChars = '0123456789abcdef';
  
  console.log('🔄 Checking if appending a character works...');
  for (const char of hexChars) {
    const candidate = `shpat_${baseToken}${char}`;
    const res = await testToken(candidate);
    if (res.success) {
      console.log(`🎉 SUCCESS! Appended "${char}". Full token: ${candidate}`);
      console.log(`Locations count: ${res.locationsCount}`);
      return;
    }
  }

  console.log('🔄 Checking if prepending a character works...');
  for (const char of hexChars) {
    const candidate = `shpat_${char}${baseToken}`;
    const res = await testToken(candidate);
    if (res.success) {
      console.log(`🎉 SUCCESS! Prepended "${char}". Full token: ${candidate}`);
      console.log(`Locations count: ${res.locationsCount}`);
      return;
    }
  }

  console.log('❌ Failed to find a valid token by appending or prepending a single hex character.');
}

run();
