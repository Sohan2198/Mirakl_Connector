require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const ShopifyClient = require('../src/clients/shopify');

async function testShopifyConnection() {
  console.log('🧪 Testing Shopify API Connection...\n');
  
  const client = new ShopifyClient(
    process.env.SHOPIFY_SHOP_URL,
    process.env.SHOPIFY_ACCESS_TOKEN,
    process.env.SHOPIFY_API_VERSION || '2026-04'
  );

  try {
    console.log('📦 Fetching products (limit: 5)...');
    const products = await client.getProducts({ limit: 5 });
    console.log(`✅ Success! Found ${products.length} products`);
    if (products.length > 0) {
      console.log('Product titles:');
      products.forEach(p => {
        console.log(` - ${p.title} (SKUs: ${p.variants.map(v => v.sku).join(', ')})`);
      });
    }

    console.log('\n📡 Fetching locations (expected to fail if read_locations scope is missing)...');
    try {
      const locations = await client.getLocations();
      console.log(`✅ Locations found: ${locations.length}`);
    } catch (err) {
      console.log(`⚠️ Expected failure fetching locations: ${err.message}`);
    }

    console.log('\n✅ Shopify API tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testShopifyConnection();
