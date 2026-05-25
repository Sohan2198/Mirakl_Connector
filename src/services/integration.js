const MiraklClient = require('../clients/mirakl');
const ShopifyClient = require('../clients/shopify');
const { addLog } = require('./logger');

class IntegrationSync {
  constructor(miraklClient, shopifyClient) {
    this.mirakl = miraklClient;
    this.shopify = shopifyClient;
  }

  // Sync products from Shopify to Mirakl
  async syncProductsToMirakl() {
    addLog('Starting product sync to Mirakl...', 'info');
    
    try {
      // Get all products from Shopify
      const statusFilter = process.env.SHOPIFY_PRODUCT_STATUS || 'active';
      const params = { limit: 250 };
      if (statusFilter && statusFilter !== 'any') {
        params.status = statusFilter;
      }
      const products = await this.shopify.getProducts(params);
      addLog(`Found ${products.length} products in Shopify (status: ${statusFilter})`, 'info');

      const offers = [];

      for (const product of products) {
        for (const variant of product.variants) {
          // Skip variants without SKU
          if (!variant.sku) {
            addLog(`Skipping variant ${variant.id} - no SKU`, 'info');
            continue;
          }

          const offer = {
            'product-id': variant.sku,
            'product-id-type': 'SHOP_SKU',
            'quantity': variant.inventory_quantity || 0,
            'price': variant.price,
            'description': product.body_html || product.title,
            'state-code': 11, // New product state
            'available-start-date': new Date().toISOString().split('T')[0],
            'product-title': product.title,
            'variant-title': variant.title !== 'Default Title' ? variant.title : '',
            'update-delete': 'update'
          };

          offers.push(offer);
          addLog(`Prepared offer for SKU: ${variant.sku}`, 'info');
        }
      }

      if (offers.length > 0) {
        // Mirakl accepts batch updates
        const result = await this.mirakl.upsertOffer({ offers });
        addLog(`✅ Synced ${offers.length} products to Mirakl`, 'success');
        return result;
      } else {
        addLog('No products to sync', 'info');
        return null;
      }

    } catch (error) {
      addLog(`❌ Error syncing products to Mirakl: ${error.message}`, 'error');
      throw error;
    }
  }

  // Sync orders from Mirakl to Shopify
  async syncOrdersFromMirakl() {
    addLog('Starting order sync from Mirakl...', 'info');

    try {
      // Get new orders from Mirakl (WAITING_ACCEPTANCE state)
      const ordersResponse = await this.mirakl.getOrders({
        order_state_codes: 'WAITING_ACCEPTANCE'
      });

      const orders = ordersResponse.orders || [];
      addLog(`Found ${orders.length} new orders in Mirakl`, 'info');

      for (const miraklOrder of orders) {
        try {
          // Create order in Shopify
          const shopifyOrder = await this.createShopifyOrder(miraklOrder);
          addLog(`✅ Created Shopify order ${shopifyOrder.id} for Mirakl order ${miraklOrder.order_id}`, 'success');

          // Accept the order in Mirakl
          await this.mirakl.acceptOrder(miraklOrder.order_id);
          addLog(`✅ Accepted Mirakl order ${miraklOrder.order_id}`, 'success');

        } catch (error) {
          addLog(`❌ Error processing order ${miraklOrder.order_id}: ${error.message}`, 'error');
        }
      }

      return orders.length;

    } catch (error) {
      addLog(`❌ Error syncing orders from Mirakl: ${error.message}`, 'error');
      throw error;
    }
  }

  // Create Shopify order from Mirakl order
  async createShopifyOrder(miraklOrder) {
    const lineItems = [];

    for (const item of miraklOrder.order_lines) {
      // Find product in Shopify by SKU
      const result = await this.shopify.getProductBySku(item.offer.sku);
      
      if (result) {
        lineItems.push({
          variant_id: result.variant.id,
          quantity: item.quantity,
          price: item.price
        });
      } else {
        addLog(`⚠️ Product not found in Shopify for SKU: ${item.offer.sku}`, 'warning');
      }
    }

    const orderData = {
      line_items: lineItems,
      customer: {
        first_name: miraklOrder.customer.firstname,
        last_name: miraklOrder.customer.lastname,
        email: miraklOrder.customer.email || 'nordstrom-customer@example.com'
      },
      shipping_address: {
        first_name: miraklOrder.customer.shipping_address.firstname,
        last_name: miraklOrder.customer.shipping_address.lastname,
        address1: miraklOrder.customer.shipping_address.street_1,
        address2: miraklOrder.customer.shipping_address.street_2 || '',
        city: miraklOrder.customer.shipping_address.city,
        province: miraklOrder.customer.shipping_address.state,
        zip: miraklOrder.customer.shipping_address.zip_code,
        country: miraklOrder.customer.shipping_address.country,
        phone: miraklOrder.customer.shipping_address.phone || ''
      },
      financial_status: 'paid',
      tags: `Nordstrom,Mirakl-${miraklOrder.order_id}`,
      note: `Mirakl Order ID: ${miraklOrder.order_id}`
    };

    return await this.shopify.createOrder(orderData);
  }

  // Sync inventory from Shopify to Mirakl
  async syncInventoryToMirakl() {
    addLog('Starting inventory sync to Mirakl...', 'info');

    try {
      const statusFilter = process.env.SHOPIFY_PRODUCT_STATUS || 'active';
      const params = { limit: 250 };
      if (statusFilter && statusFilter !== 'any') {
        params.status = statusFilter;
      }
      const products = await this.shopify.getProducts(params);
      const offers = [];

      for (const product of products) {
        for (const variant of product.variants) {
          if (variant.sku) {
            offers.push({
              'product-id': variant.sku,
              'product-id-type': 'SHOP_SKU',
              'quantity': variant.inventory_quantity || 0,
              'update-delete': 'update'
            });
          }
        }
      }

      if (offers.length > 0) {
        // Mirakl accepts batch updates - this prevents 429 Rate Limiting errors
        await this.mirakl.upsertOffer({ offers });
        addLog(`✅ Synced inventory for ${offers.length} items to Mirakl`, 'success');
        return offers.length;
      } else {
        addLog('No inventory items to sync', 'info');
        return 0;
      }

    } catch (error) {
      addLog(`❌ Error syncing inventory: ${error.message}`, 'error');
      throw error;
    }
  }
}

module.exports = IntegrationSync;
