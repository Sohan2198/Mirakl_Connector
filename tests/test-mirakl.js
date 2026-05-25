require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const MiraklClient = require('../src/clients/mirakl');

async function testMiraklConnection() {
  console.log('🧪 Testing Mirakl API Connection...\n');
  
  const client = new MiraklClient(
    process.env.MIRAKL_API_URL,
    process.env.MIRAKL_API_KEY
  );

  try {
    console.log('📡 Fetching shop information...');
    const shopInfo = await client.getShopInfo();
    console.log('✅ Shop Info Retrieved:');
    console.log(JSON.stringify(shopInfo, null, 2));
    console.log('\n');

    console.log('📦 Fetching current offers...');
    const offers = await client.getOffers({ max: 5 });
    console.log(`✅ Found ${offers.offers?.length || 0} offers`);
    if (offers.offers && offers.offers.length > 0) {
      console.log('First offer sample:');
      console.log(JSON.stringify(offers.offers[0], null, 2));
    }
    console.log('\n');

    console.log('📋 Fetching orders...');
    const orders = await client.getOrders({ max: 5 });
    console.log(`✅ Found ${orders.orders?.length || 0} orders`);
    if (orders.orders && orders.orders.length > 0) {
      console.log('First order sample:');
      console.log(JSON.stringify(orders.orders[0], null, 2));
    }

    console.log('\n✅ All Mirakl API tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testMiraklConnection();
