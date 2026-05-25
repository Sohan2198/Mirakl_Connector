const axios = require('axios');

const shopUrl = 'hairdrama-us.myshopify.com';
const baseToken = '2aa808babeba09a0de6eeb3241de7f8';
const apiVersion = '2024-01';

// Generate all unique candidate tokens of length 32 hex chars (38 total with shpat_)
function generateCandidates() {
  const hexChars = '0123456789abcdef';
  const candidates = new Set();

  // Insertion points: 0 to baseToken.length (inclusive)
  for (let i = 0; i <= baseToken.length; i++) {
    for (const char of hexChars) {
      const hexPart = baseToken.slice(0, i) + char + baseToken.slice(i);
      candidates.add(`shpat_${hexPart}`);
    }
  }

  return Array.from(candidates);
}

async function testToken(token) {
  const url = `https://${shopUrl}/admin/api/${apiVersion}/locations.json`;
  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    return { success: true, token, locationsCount: response.data.locations?.length };
  } catch (error) {
    if (error.response) {
      return { success: false, status: error.response.status, data: error.response.data };
    }
    return { success: false, error: error.message };
  }
}

async function run() {
  const candidates = generateCandidates();
  console.log(`🔍 Generated ${candidates.length} candidate tokens to test...`);

  // Let's test them in chunks to avoid overwhelming the Shopify API and triggering rate limits
  const chunkSize = 15;
  const delayMs = 300; // Delay between chunks

  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    console.log(`📡 Testing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(candidates.length / chunkSize)} (indices ${i} to ${i + chunk.length - 1})...`);

    const results = await Promise.all(chunk.map(token => testToken(token)));

    for (const result of results) {
      if (result.success) {
        console.log(`\n🎉 SUCCESS! Valid token found: ${result.token}`);
        console.log(`Locations count: ${result.locationsCount}`);
        return;
      }
    }

    // Check if we hit rate limits (429)
    const hitRateLimit = results.some(r => r.status === 429);
    if (hitRateLimit) {
      console.log('⚠️ Hit rate limit (429). Waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log('❌ Failed to find a valid token. The access token might be missing more than 1 character or be completely different.');
}

run();
