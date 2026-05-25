const axios = require('axios');

class ShopifyClient {
  constructor(shopUrl, accessToken, apiVersion, clientId = null, clientSecret = null) {
    this.shopUrl = shopUrl;
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
    this.clientId = clientId || process.env.SHOPIFY_CLIENT_ID;
    this.clientSecret = clientSecret || process.env.SHOPIFY_CLIENT_SECRET;
    this.baseUrl = `https://${shopUrl}/admin/api/${apiVersion}`;
    this.tokenExpiry = null;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add interceptor to dynamically inject the correct headers/access token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getValidToken();
      if (token) {
        if (token.startsWith('atkn_')) {
          config.headers['Authorization'] = `Bearer ${token}`;
        } else {
          config.headers['X-Shopify-Access-Token'] = token;
        }
      }
      return config;
    });
  }

  // Retrieve/refresh the access token using Client Credentials Grant if credentials exist
  async getValidToken() {
    if (this.accessToken && !this.clientId) {
      return this.accessToken;
    }

    if (this.clientId && this.clientSecret) {
      const now = Date.now();
      // Use cached token if it has at least 5 minutes remaining
      if (this.accessToken && this.tokenExpiry && (this.tokenExpiry - now > 5 * 60 * 1000)) {
        return this.accessToken;
      }

      try {
        const url = `https://${this.shopUrl}/admin/oauth/access_token`;
        const response = await axios.post(url, {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        this.accessToken = response.data.access_token;
        if (response.data.expires_in) {
          this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        } else {
          this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
        }

        // Keep process.env updated in memory
        process.env.SHOPIFY_ACCESS_TOKEN = this.accessToken;

        return this.accessToken;
      } catch (error) {
        console.error('[ShopifyClient] Error fetching access token via client credentials grant:', error.response?.data || error.message);
        if (this.accessToken) return this.accessToken;
        throw error;
      }
    }

    return this.accessToken;
  }

  // Get products
  async getProducts(params = {}) {
    try {
      const response = await this.client.get('/products.json', { params });
      return response.data.products;
    } catch (error) {
      console.error('Error fetching products:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get single product
  async getProduct(productId) {
    try {
      const response = await this.client.get(`/products/${productId}.json`);
      return response.data.product;
    } catch (error) {
      console.error('Error fetching product:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get inventory levels for a location
  async getInventoryLevels(locationId) {
    try {
      const response = await this.client.get('/inventory_levels.json', {
        params: { location_ids: locationId }
      });
      return response.data.inventory_levels;
    } catch (error) {
      console.error('Error fetching inventory:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get locations
  async getLocations() {
    try {
      const response = await this.client.get('/locations.json');
      return response.data.locations;
    } catch (error) {
      const errorMsg = JSON.stringify(error.response?.data) || error.message;
      if (errorMsg.includes('read_locations') || error.response?.status === 403) {
        console.warn('⚠️ [ShopifyClient] Warning: Access token lacks read_locations scope permission.');
      } else {
        console.error('Error fetching locations:', error.response?.data || error.message);
      }
      throw error;
    }
  }

  // Create order
  async createOrder(orderData) {
    try {
      const response = await this.client.post('/orders.json', { order: orderData });
      return response.data.order;
    } catch (error) {
      console.error('Error creating order:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update order
  async updateOrder(orderId, orderData) {
    try {
      const response = await this.client.put(`/orders/${orderId}.json`, { order: orderData });
      return response.data.order;
    } catch (error) {
      console.error('Error updating order:', error.response?.data || error.message);
      throw error;
    }
  }

  // Create fulfillment
  async createFulfillment(orderId, fulfillmentData) {
    try {
      const response = await this.client.post(`/orders/${orderId}/fulfillments.json`, {
        fulfillment: fulfillmentData
      });
      return response.data.fulfillment;
    } catch (error) {
      console.error('Error creating fulfillment:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get product by SKU with cursor-based pagination
  async getProductBySku(sku) {
    try {
      let pageInfo = null;
      let limit = 250;
      let hasNextPage = true;
      
      while (hasNextPage) {
        const params = { limit };
        if (pageInfo) {
          params.page_info = pageInfo;
        }
        
        const response = await this.client.get('/products.json', { params });
        const products = response.data.products;
        
        for (const product of products) {
          for (const variant of product.variants) {
            if (variant.sku === sku) {
              return { product, variant };
            }
          }
        }
        
        const linkHeader = response.headers['link'];
        hasNextPage = false;
        pageInfo = null;
        
        if (linkHeader) {
          const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (match) {
            const nextUrl = new URL(match[1]);
            pageInfo = nextUrl.searchParams.get('page_info');
            limit = nextUrl.searchParams.get('limit') || 250;
            hasNextPage = true;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding product by SKU:', error.message);
      throw error;
    }
  }
}

module.exports = ShopifyClient;
