require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const shopUrls = [
  'hairdrama-us.myshopify.com',
  'hairdramacompany.myshopify.com',
  'hairdrama-company.myshopify.com',
  'hairdrama-usa.myshopify.com',
  'hairdrama.myshopify.com',
  'hairdramausa.myshopify.com',
  'hairdramacompany-us.myshopify.com'
];
const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-04';
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || 'your-access-token';

async function testShop(shopUrl) {
  const url = `https://${shopUrl}/admin/api/${apiVersion}/locations.json`;
  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log(`🎉 SUCCESS on ${shopUrl}: found ${response.data.locations?.length} locations`);
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`❌ Failed on ${shopUrl}: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`❌ Failed on ${shopUrl}: ${error.message}`);
    }
    return false;
  }
}

async function run() {
  console.log('🔄 Scanning potential Shopify shop domains...');
  for (const shopUrl of shopUrls) {
    const success = await testShop(shopUrl);
    if (success) {
      console.log(`\n🎉 Found matching shop URL: ${shopUrl}`);
      return;
    }
  }
  console.log('\n❌ None of the domains worked.');
}

run();
