const cron = require('node-cron');
const { addLog } = require('./logger');
const MiraklClient = require('../clients/mirakl');
const ShopifyClient = require('../clients/shopify');
const IntegrationSync = require('./integration');

let inventoryCronJob = null;
let orderCronJob = null;
let productCronJob = null;

function getSyncInstance() {
  require('dotenv').config({ override: true });

  const mirakl = new MiraklClient(
    process.env.MIRAKL_API_URL,
    process.env.MIRAKL_API_KEY
  );
  const shopify = new ShopifyClient(
    process.env.SHOPIFY_SHOP_URL,
    process.env.SHOPIFY_ACCESS_TOKEN,
    process.env.SHOPIFY_API_VERSION,
    process.env.SHOPIFY_CLIENT_ID,
    process.env.SHOPIFY_CLIENT_SECRET
  );
  return new IntegrationSync(mirakl, shopify);
}

function scheduleJobs() {
  require('dotenv').config({ override: true });
  const syncInterval = process.env.SYNC_INTERVAL_MINUTES || 15;
  
  if (inventoryCronJob) inventoryCronJob.stop();
  if (orderCronJob) orderCronJob.stop();
  if (productCronJob) productCronJob.stop();

  addLog(`Scheduling automated inventory sync every ${syncInterval} minutes`, 'info');
  inventoryCronJob = cron.schedule(`*/${syncInterval} * * * *`, async () => {
    addLog('Running scheduled inventory sync...', 'info');
    try {
      const syncInstance = getSyncInstance();
      const count = await syncInstance.syncInventoryToMirakl();
      addLog(`Scheduled inventory sync completed. Synced inventory for ${count} items.`, 'success');
    } catch (error) {
      addLog(`Scheduled inventory sync failed: ${error.message}`, 'error');
    }
  });

  orderCronJob = cron.schedule('*/5 * * * *', async () => {
    addLog('Running scheduled order sync...', 'info');
    try {
      const syncInstance = getSyncInstance();
      const count = await syncInstance.syncOrdersFromMirakl();
      addLog(`Scheduled order sync completed. Synced ${count} orders.`, 'success');
    } catch (error) {
      addLog(`Scheduled order sync failed: ${error.message}`, 'error');
    }
  });

  productCronJob = cron.schedule('0 * * * *', async () => {
    addLog('Running scheduled product sync...', 'info');
    try {
      const syncInstance = getSyncInstance();
      await syncInstance.syncProductsToMirakl();
      addLog('Scheduled product sync completed.', 'success');
    } catch (error) {
      addLog(`Scheduled product sync failed: ${error.message}`, 'error');
    }
  });
}

module.exports = {
  scheduleJobs,
  getSyncInstance
};
