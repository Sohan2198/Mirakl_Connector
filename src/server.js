const app = require('./app');
const { addLog } = require('./services/logger');
const { scheduleJobs } = require('./services/scheduler');
const MiraklClient = require('./clients/mirakl');
const ShopifyClient = require('./clients/shopify');

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  addLog(`Shopify-Mirakl Integration Server Started on port ${PORT}`, 'info');
  
  // Initialize cron jobs
  scheduleJobs();

  // Trigger non-blocking initial connection check
  addLog('Performing initial connection tests...', 'info');
  
  const tempMirakl = new MiraklClient(process.env.MIRAKL_API_URL, process.env.MIRAKL_API_KEY);
  const tempShopify = new ShopifyClient(
    process.env.SHOPIFY_SHOP_URL,
    process.env.SHOPIFY_ACCESS_TOKEN,
    process.env.SHOPIFY_API_VERSION,
    process.env.SHOPIFY_CLIENT_ID,
    process.env.SHOPIFY_CLIENT_SECRET
  );

  try {
    await tempMirakl.getOffers({ max: 1 });
    addLog('Mirakl API connection successful', 'success');
  } catch (error) {
    addLog(`Mirakl API connection failed: ${error.message}`, 'error');
  }

  try {
    await tempShopify.getProducts({ limit: 1 });
    addLog('Shopify API connection successful', 'success');
  } catch (error) {
    addLog(`Shopify API connection failed: ${error.message}`, 'error');
  }
});
