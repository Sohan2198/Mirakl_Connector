const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ShopifyClient = require('../clients/shopify');
const MiraklClient = require('../clients/mirakl');
const { addLog, getLogs } = require('../services/logger');
const { getSyncInstance, scheduleJobs } = require('../services/scheduler');

const rootDir = path.resolve(__dirname, '..', '..');

// Connection status
router.get('/api/connection-status', async (req, res) => {
  require('dotenv').config({ override: true });

  const status = {
    mirakl: { connected: false, error: null, shopName: null, shopId: null, url: process.env.MIRAKL_API_URL },
    shopify: { connected: false, error: null, shopUrl: process.env.SHOPIFY_SHOP_URL, locationsCount: 0 }
  };

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
    status.mirakl.connected = true;
    status.mirakl.shopId = process.env.MIRAKL_SHOP_ID || 'N/A';
  } catch (err) {
    status.mirakl.error = err.response?.data?.message || err.response?.data || err.message;
  }

  try {
    await tempShopify.getProducts({ limit: 1 });
    status.shopify.connected = true;
    try {
      const locations = await tempShopify.getLocations();
      status.shopify.locationsCount = locations?.length || 0;
    } catch (locErr) {
      status.shopify.locationsCount = 'N/A';
    }
  } catch (err) {
    status.shopify.error = err.response?.data?.errors || err.response?.data?.error || err.message;
  }

  res.json(status);
});

// Logs endpoint
router.get('/api/logs', (req, res) => {
  res.json(getLogs());
});

// File structure helper
function getFileTree(dir, relativePath = '') {
  const absolutePath = path.join(dir, relativePath);
  try {
    const stats = fs.statSync(absolutePath);
    const name = path.basename(absolutePath);

    if (stats.isDirectory()) {
      if (name === 'node_modules' || name === '.git') return null;

      const files = fs.readdirSync(absolutePath);
      const children = files
        .map(child => getFileTree(dir, path.join(relativePath, child)))
        .filter(Boolean);

      return {
        name,
        path: relativePath.replace(/\\/g, '/'),
        type: 'directory',
        children
      };
    } else {
      return {
        name,
        path: relativePath.replace(/\\/g, '/'),
        type: 'file',
        size: stats.size
      };
    }
  } catch (err) {
    return null;
  }
}

// Get file tree
router.get('/api/project-files', (req, res) => {
  try {
    const files = fs.readdirSync(rootDir);
    const children = files
      .map(child => getFileTree(rootDir, child))
      .filter(Boolean);
    res.json({ name: path.basename(rootDir), type: 'directory', children });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get file contents
router.get('/api/file-content', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path is required' });

  const safePath = path.normalize(path.join(rootDir, filePath));
  if (!safePath.startsWith(rootDir)) {
    return res.status(403).json({ error: 'Access denied: Path lies outside workspace.' });
  }

  try {
    const content = fs.readFileSync(safePath, 'utf8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save file contents
router.post('/api/save-file', (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Path and content are required' });
  }

  const safePath = path.normalize(path.join(rootDir, filePath));
  if (!safePath.startsWith(rootDir)) {
    return res.status(403).json({ error: 'Access denied: Path lies outside workspace.' });
  }

  try {
    fs.writeFileSync(safePath, content, 'utf8');
    addLog(`Updated file: ${filePath}`, 'info');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shopify Products
router.get('/api/data/products', async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const client = new ShopifyClient(
      process.env.SHOPIFY_SHOP_URL,
      process.env.SHOPIFY_ACCESS_TOKEN,
      process.env.SHOPIFY_API_VERSION,
      process.env.SHOPIFY_CLIENT_ID,
      process.env.SHOPIFY_CLIENT_SECRET
    );
    const statusFilter = process.env.SHOPIFY_PRODUCT_STATUS || 'active';
    const params = { limit: 250 };
    if (statusFilter && statusFilter !== 'any') {
      params.status = statusFilter;
    }
    const products = await client.getProducts(params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mirakl Offers
router.get('/api/data/offers', async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const client = new MiraklClient(process.env.MIRAKL_API_URL, process.env.MIRAKL_API_KEY);
    const offersResponse = await client.getOffers({ max: 100 });
    res.json(offersResponse.offers || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mirakl Orders
router.get('/api/data/orders', async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const client = new MiraklClient(process.env.MIRAKL_API_URL, process.env.MIRAKL_API_KEY);
    const ordersResponse = await client.getOrders({ max: 100 });
    res.json(ordersResponse.orders || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get mapped products for comparison
router.get('/api/data/mapped-products', async (req, res) => {
  try {
    require('dotenv').config({ override: true });
    const shopify = new ShopifyClient(
      process.env.SHOPIFY_SHOP_URL,
      process.env.SHOPIFY_ACCESS_TOKEN,
      process.env.SHOPIFY_API_VERSION,
      process.env.SHOPIFY_CLIENT_ID,
      process.env.SHOPIFY_CLIENT_SECRET
    );
    const mirakl = new MiraklClient(
      process.env.MIRAKL_API_URL,
      process.env.MIRAKL_API_KEY
    );

    const statusFilter = process.env.SHOPIFY_PRODUCT_STATUS || 'active';
    const params = { limit: 250 };
    if (statusFilter && statusFilter !== 'any') {
      params.status = statusFilter;
    }

    const [products, offersResponse] = await Promise.all([
      shopify.getProducts(params).catch(err => {
        console.error('Error fetching products for mapping:', err.message);
        return [];
      }),
      mirakl.getOffers({ max: 100 }).catch(err => {
        console.error('Error fetching offers for mapping:', err.message);
        return { offers: [] };
      })
    ]);

    const offers = offersResponse.offers || [];
    const offersMap = new Map();
    for (const offer of offers) {
      if (offer['product-id']) {
        offersMap.set(offer['product-id'], offer);
      }
    }

    const mapped = [];
    const shopifySkus = new Set();

    for (const product of products) {
      for (const variant of product.variants) {
        if (!variant.sku) continue;
        
        shopifySkus.add(variant.sku);
        const miraklOffer = offersMap.get(variant.sku);
        
        let syncStatus = 'shopify_only';
        let miraklPrice = null;
        let miraklQty = null;
        
        if (miraklOffer) {
          miraklPrice = miraklOffer.price;
          miraklQty = miraklOffer.quantity;
          
          const priceDiff = parseFloat(variant.price) !== parseFloat(miraklPrice);
          const stockDiff = parseInt(variant.inventory_quantity || 0, 10) !== parseInt(miraklQty || 0, 10);
          
          if (priceDiff && stockDiff) {
            syncStatus = 'price_and_stock_mismatch';
          } else if (priceDiff) {
            syncStatus = 'price_mismatch';
          } else if (stockDiff) {
            syncStatus = 'stock_mismatch';
          } else {
            syncStatus = 'synced';
          }
        }
        
        mapped.push({
          sku: variant.sku,
          title: product.title,
          variantTitle: variant.title !== 'Default Title' ? variant.title : '',
          imageUrl: product.image?.src || null,
          shopifyStatus: product.status,
          shopifyPrice: variant.price,
          shopifyStock: variant.inventory_quantity || 0,
          miraklPrice,
          miraklStock: miraklQty,
          syncStatus
        });
      }
    }

    for (const [sku, offer] of offersMap.entries()) {
      if (!shopifySkus.has(sku)) {
        mapped.push({
          sku,
          title: offer['product-title'] || 'Unknown Offer',
          variantTitle: '',
          imageUrl: null,
          shopifyStatus: 'none',
          shopifyPrice: null,
          shopifyStock: null,
          miraklPrice: offer.price,
          miraklStock: offer.quantity,
          syncStatus: 'mirakl_only'
        });
      }
    }

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync a single SKU to Mirakl
router.post('/api/sync/sku', async (req, res) => {
  const { sku } = req.body;
  if (!sku) return res.status(400).json({ error: 'SKU is required' });

  try {
    addLog(`Single SKU sync triggered for SKU: ${sku}`, 'info');
    const syncInstance = getSyncInstance();
    const result = await syncInstance.shopify.getProductBySku(sku);
    if (!result) {
      addLog(`Failed to sync SKU ${sku}: Not found in Shopify`, 'error');
      return res.status(404).json({ success: false, error: 'Product not found in Shopify' });
    }

    const { product, variant } = result;

    const offer = {
      'product-id': variant.sku,
      'product-id-type': 'SHOP_SKU',
      'quantity': variant.inventory_quantity || 0,
      'price': variant.price,
      'description': product.body_html || product.title,
      'state-code': 11,
      'available-start-date': new Date().toISOString().split('T')[0],
      'product-title': product.title,
      'variant-title': variant.title !== 'Default Title' ? variant.title : '',
      'update-delete': 'update'
    };

    const syncResult = await syncInstance.mirakl.upsertOffer({ offers: [offer] });
    addLog(`Successfully synced SKU ${sku} to Mirakl`, 'success');
    res.json({ success: true, message: `SKU ${sku} synced to Mirakl`, result: syncResult });
  } catch (error) {
    addLog(`Failed to sync SKU ${sku}: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync multiple SKUs to Mirakl
router.post('/api/sync/skus', async (req, res) => {
  const { skus } = req.body;
  if (!skus || !Array.isArray(skus)) return res.status(400).json({ error: 'List of SKUs is required' });

  try {
    addLog(`Batch SKU sync triggered for ${skus.length} SKUs`, 'info');
    const syncInstance = getSyncInstance();
    const offers = [];
    const missingSkus = [];

    for (const sku of skus) {
      const result = await syncInstance.shopify.getProductBySku(sku);
      if (result) {
        const { product, variant } = result;
        offers.push({
          'product-id': variant.sku,
          'product-id-type': 'SHOP_SKU',
          'quantity': variant.inventory_quantity || 0,
          'price': variant.price,
          'description': product.body_html || product.title,
          'state-code': 11,
          'available-start-date': new Date().toISOString().split('T')[0],
          'product-title': product.title,
          'variant-title': variant.title !== 'Default Title' ? variant.title : '',
          'update-delete': 'update'
        });
      } else {
        missingSkus.push(sku);
      }
    }

    if (offers.length > 0) {
      const syncResult = await syncInstance.mirakl.upsertOffer({ offers });
      addLog(`Successfully synced ${offers.length} SKUs to Mirakl`, 'success');
      res.json({
        success: true,
        message: `Synced ${offers.length} SKUs to Mirakl`,
        result: syncResult,
        missing: missingSkus
      });
    } else {
      res.json({ success: false, message: 'No valid SKUs found to sync', missing: missingSkus });
    }
  } catch (error) {
    addLog(`Failed to sync SKUs: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual sync endpoints
router.post('/sync/products', async (req, res) => {
  try {
    addLog('Manual product sync triggered', 'info');
    const syncInstance = getSyncInstance();
    const result = await syncInstance.syncProductsToMirakl();
    addLog('Manual product sync completed successfully', 'success');
    res.json({ success: true, message: 'Products synced to Mirakl', result });
  } catch (error) {
    addLog(`Manual product sync failed: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync/orders', async (req, res) => {
  try {
    addLog('Manual order sync triggered', 'info');
    const syncInstance = getSyncInstance();
    const count = await syncInstance.syncOrdersFromMirakl();
    addLog(`Manual order sync completed. Synced ${count} orders.`, 'success');
    res.json({ success: true, message: `Synced ${count} orders from Mirakl` });
  } catch (error) {
    addLog(`Manual order sync failed: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync/inventory', async (req, res) => {
  try {
    addLog('Manual inventory sync triggered', 'info');
    const syncInstance = getSyncInstance();
    const count = await syncInstance.syncInventoryToMirakl();
    addLog(`Manual inventory sync completed. Synced inventory for ${count} items.`, 'success');
    res.json({ success: true, message: `Synced ${count} inventory items` });
  } catch (error) {
    addLog(`Manual inventory sync failed: ${error.message}`, 'error');
    res.status(500).json({ success: false, error: error.message });
  }
});

// Settings CRUD
router.get('/api/settings', (req, res) => {
  require('dotenv').config({ override: true });
  res.json({
    MIRAKL_API_URL: process.env.MIRAKL_API_URL || '',
    MIRAKL_API_KEY: process.env.MIRAKL_API_KEY || '',
    MIRAKL_SHOP_ID: process.env.MIRAKL_SHOP_ID || '',
    SHOPIFY_SHOP_URL: process.env.SHOPIFY_SHOP_URL || '',
    SHOPIFY_CLIENT_ID: process.env.SHOPIFY_CLIENT_ID || '',
    SHOPIFY_CLIENT_SECRET: process.env.SHOPIFY_CLIENT_SECRET || '',
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN || '',
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || '2026-04',
    SYNC_INTERVAL_MINUTES: process.env.SYNC_INTERVAL_MINUTES || '15',
    PORT: process.env.PORT || '3000',
    SHOPIFY_PRODUCT_STATUS: process.env.SHOPIFY_PRODUCT_STATUS || 'active'
  });
});

router.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    let envContent = '';
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        envContent += `${key}=${value}\n`;
      }
    }
    
    fs.writeFileSync(path.join(rootDir, '.env'), envContent, 'utf8');
    require('dotenv').config({ override: true });
    
    addLog('Configuration settings updated successfully', 'success');
    
    // Reschedule jobs with the updated interval
    scheduleJobs();
    
    res.json({ success: true, message: 'Settings saved and cron jobs rescheduled.' });
  } catch (err) {
    addLog(`Failed to save settings: ${err.message}`, 'error');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
