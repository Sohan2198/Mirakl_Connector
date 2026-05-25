const axios = require('axios');

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
      // Use seller account endpoint instead of shops
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

  // Create or update offer
  async upsertOffer(offerData) {
    try {
      const response = await this.client.post('/api/offers', offerData);
      return response.data;
    } catch (error) {
      console.error('Error upserting offer:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update inventory
  async updateInventory(sku, quantity) {
    try {
      const response = await this.client.post('/api/offers', {
        offers: [{
          'product-id': sku,
          'product-id-type': 'SHOP_SKU',
          quantity: quantity,
          'update-delete': 'update'
        }]
      });
      return response.data;
    } catch (error) {
      console.error('Error updating inventory:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = MiraklClient;
