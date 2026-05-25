const axios = require('axios');
const FormData = require('form-data');

class MiraklClient {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // Get shop information (seller account info)
  async getShopInfo() {
    try {
      const response = await this.client.get('/api/account');
      return response.data;
    } catch (error) {
      console.error('Error fetching shop info:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get orders
  async getOrders(params = {}) {
    try {
      const response = await this.client.get('/api/orders', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching orders:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get single order details
  async getOrder(orderId) {
    try {
      const response = await this.client.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error.response?.data || error.message);
      throw error;
    }
  }

  // Accept order
  async acceptOrder(orderId) {
    try {
      const response = await this.client.put(`/api/orders/${orderId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Error accepting order:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update order tracking
  async updateTracking(orderId, trackingData) {
    try {
      const response = await this.client.put(`/api/orders/${orderId}/tracking`, trackingData);
      return response.data;
    } catch (error) {
      console.error('Error updating tracking:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get products/offers
  async getOffers(params = {}) {
    try {
      const response = await this.client.get('/api/offers', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching offers:', error.response?.data || error.message);
      throw error;
    }
  }

  // ─── CSV helpers ────────────────────────────────────────────────────────────

  _escape(val) {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/<[^>]*>/g, ''); // strip HTML tags
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Build offer CSV for Mirakl OF01 (POST /api/offers/imports).
   * Each offer MUST have: sku, product-id, product-id-type, price, quantity, state, update-delete
   */
  _offersToCSV(offers) {
    const headers = [
      'sku', 'product-id', 'product-id-type',
      'price', 'quantity', 'state',
      'available-start-date', 'update-delete', 'description'
    ];

    const rows = offers.map(o => [
      this._escape(o['sku'] || o['product-id'] || ''),
      this._escape(o['product-id'] || ''),
      this._escape(o['product-id-type'] || 'SHOP_SKU'),
      this._escape(o['price'] || ''),
      this._escape(o['quantity'] !== undefined ? o['quantity'] : ''),
      this._escape(o['state-code'] || '11'),
      this._escape(o['available-start-date'] || new Date().toISOString().split('T')[0]),
      this._escape(o['update-delete'] || 'update'),
      this._escape(o['description'] || '')
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Build product CSV for Mirakl P41 (POST /api/products/imports).
   * Nordstrom/Mirakl: sellers submit products for operator approval.
   */
  _productsToCSV(products) {
    // Minimal required columns for seller-side product creation
    const headers = [
      'product-sku',
      'product-title',
      'category',
      'description',
      'brand',
      'update-delete'
    ];

    const rows = products.map(p => [
      this._escape(p['product-sku']),
      this._escape(p['product-title']),
      this._escape(p['category'] || ''),
      this._escape(p['description'] || ''),
      this._escape(p['brand'] || ''),
      this._escape(p['update-delete'] || 'update')
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  // ─── Import polling ──────────────────────────────────────────────────────────

  async _waitForImport(importId, endpoint = 'offers', maxRetries = 12, delayMs = 3000) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      try {
        const statusRes = await this.client.get(`/api/${endpoint}/imports/${importId}`);
        const status = statusRes.data;

        if (status.status === 'COMPLETE' || status.status === 'FAILED') {
          if (status.has_error_report) {
            try {
              const errRes = await this.client.get(`/api/${endpoint}/imports/${importId}/error_report`);
              status.error_report = errRes.data;
            } catch (_) { /* ignore */ }
          }
          return status;
        }
      } catch (err) {
        console.warn(`[MiraklClient] Polling attempt ${i + 1} failed: ${err.message}`);
      }
    }
    throw new Error(`Import ${importId} did not complete within ${Math.round(maxRetries * delayMs / 1000)}s`);
  }

  async _uploadCSV(csvContent, apiPath, importMode = 'NORMAL') {
    const form = new FormData();
    form.append('file', Buffer.from(csvContent, 'utf-8'), {
      filename: 'import.csv',
      contentType: 'text/csv'
    });

    const response = await axios.post(
      `${this.apiUrl}${apiPath}?import_mode=${importMode}`,
      form,
      {
        headers: {
          'Authorization': this.apiKey,
          ...form.getHeaders()
        }
      }
    );
    return response.data;
  }

  // ─── Public methods ──────────────────────────────────────────────────────────

  /**
   * Step 1: Import products into Mirakl catalog (P41).
   * Products must exist in Mirakl before offers can be attached.
   * On Nordstrom Mirakl, submitted products go to "pending approval" by Nordstrom.
   * Returns { import_id, lines_in_success, lines_in_error, error_report? }
   */
  async importProducts(products) {
    if (!products || products.length === 0) return { lines_in_success: 0, lines_in_error: 0 };

    const csv = this._productsToCSV(products);

    try {
      const { import_id } = await this._uploadCSV(csv, '/api/products/imports');
      console.log(`[MiraklClient] Product import submitted. import_id=${import_id}`);

      const status = await this._waitForImport(import_id, 'products');
      console.log(`[MiraklClient] Product import ${import_id}: ${status.lines_in_success} ok, ${status.lines_in_error} errors.`);

      if (status.lines_in_error > 0 && status.error_report) {
        console.error(`[MiraklClient] Product import errors:\n${status.error_report}`);
      }
      return status;
    } catch (error) {
      // P41 may not be available on all Mirakl marketplaces – log and continue
      const detail = error.response?.data || error.message;
      console.warn(`[MiraklClient] Product import not available or failed: ${JSON.stringify(detail)}`);
      return { lines_in_success: 0, lines_in_error: products.length, skipped: true };
    }
  }

  /**
   * Step 2: Create or update offers via Mirakl OF01 CSV import.
   * Requires the product (by SKU) to already exist in Mirakl catalog.
   * Returns the final import status object.
   */
  async upsertOffer(offerData) {
    const offers = offerData.offers || [];
    if (offers.length === 0) return { lines_in_success: 0, lines_in_error: 0 };

    // Ensure each offer has 'sku' field (same as product-id)
    const normalised = offers.map(o => ({
      ...o,
      'sku': o['sku'] || o['product-id'] || ''
    }));

    const csv = this._offersToCSV(normalised);

    try {
      const { import_id } = await this._uploadCSV(csv, '/api/offers/imports');
      console.log(`[MiraklClient] Offer import submitted. import_id=${import_id}. Waiting...`);

      const finalStatus = await this._waitForImport(import_id, 'offers');

      if (finalStatus.lines_in_error > 0) {
        const errDetail = finalStatus.error_report || '(no report fetched)';
        console.error(`[MiraklClient] Offer import ${import_id} had ${finalStatus.lines_in_error} error(s):\n${errDetail}`);
      }

      console.log(`[MiraklClient] Offer import ${import_id} done: ${finalStatus.lines_in_success} synced, ${finalStatus.lines_in_error} errors.`);
      return finalStatus;
    } catch (error) {
      console.error('Error upserting offer:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update inventory for a single SKU
  async updateInventory(sku, quantity) {
    return this.upsertOffer({
      offers: [{
        'sku': sku,
        'product-id': sku,
        'product-id-type': 'SHOP_SKU',
        quantity: quantity,
        'update-delete': 'update'
      }]
    });
  }
}

module.exports = MiraklClient;
