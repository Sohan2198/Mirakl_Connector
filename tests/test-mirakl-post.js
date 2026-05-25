require('dotenv').config();
const MiraklClient = require('../src/clients/mirakl');

async function testPost() {
  const client = new MiraklClient(process.env.MIRAKL_API_URL, process.env.MIRAKL_API_KEY);
  
  console.log('📡 Testing CSV-based offer upsert for SKU: SHDC-0849...');
  
  try {
    const result = await client.upsertOffer({
      offers: [{
        'sku': 'SHDC-0849',
        'product-id': 'SHDC-0849',
        'product-id-type': 'SHOP_SKU',
        'price': '49.99',
        'quantity': 10,
        'state-code': 11,
        'available-start-date': new Date().toISOString().split('T')[0],
        'update-delete': 'update',
        'description': 'Test product'
      }]
    });

    console.log('\n✅ Final Import Result:');
    console.log(`  Lines read:       ${result.lines_read}`);
    console.log(`  Lines in success: ${result.lines_in_success}`);
    console.log(`  Lines in error:   ${result.lines_in_error}`);
    console.log(`  Offers inserted:  ${result.offer_inserted}`);
    console.log(`  Offers updated:   ${result.offer_updated}`);
    console.log(`  Status:           ${result.status}`);

    if (result.lines_in_success > 0) {
      console.log('\n🎉 SKU successfully synced to Mirakl!');
    } else {
      console.log('\n❌ SKU sync failed. Check error report above.');
      if (result.error_report) {
        console.log('\nError Report:\n', result.error_report);
      }
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testPost();
