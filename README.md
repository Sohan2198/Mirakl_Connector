# Shopify-Mirakl Integration

Custom integration to sync products, orders, and inventory between Shopify and Nordstrom's Mirakl marketplace.

## Features

✅ **Product Sync**: Automatically sync products from Shopify to Mirakl  
✅ **Order Import**: Fetch new orders from Mirakl and create them in Shopify  
✅ **Inventory Sync**: Keep inventory levels synchronized  
✅ **Scheduled Jobs**: Automated syncing at configured intervals  
✅ **Manual Triggers**: API endpoints for on-demand syncing  

## Prerequisites

- Node.js 16+ installed
- Shopify store with API access
- Nordstrom Mirakl seller account with API key
- Server or hosting platform (Render, Railway, DigitalOcean, etc.)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Mirakl API Configuration
MIRAKL_API_URL=https://nordstromus-prod.mirakl.net
MIRAKL_API_KEY=e816383a-312d-42cd-b295-3a983dfcec2d
MIRAKL_SHOP_ID=

# Shopify API Configuration
SHOPIFY_SHOP_URL=hairdramacompany.myshopify.com
SHOPIFY_ACCESS_TOKEN=your-shopify-access-token
SHOPIFY_API_VERSION=2024-01

# Sync Settings
SYNC_INTERVAL_MINUTES=15
PORT=3000
```

### 3. Get Shopify Access Token

1. Go to Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps"
3. Create a new app or select existing
4. Configure Admin API scopes:
   - `read_products`
   - `write_products`
   - `read_inventory`
   - `write_inventory`
   - `read_orders`
   - `write_orders`
5. Install the app to your store
6. Copy the **Admin API access token**

### 4. Test Connections

Test Mirakl connection:
```bash
npm run test-mirakl
```

This will verify:
- API authentication works
- Shop information is retrievable
- You can access orders and offers

### 5. Run the Integration

Development mode (with auto-restart):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## How It Works

### Automated Syncing

Once running, the integration automatically:

1. **Every 5 minutes**: Checks for new orders in Mirakl
2. **Every 15 minutes** (configurable): Syncs inventory to Mirakl
3. **Every hour**: Syncs products to Mirakl

### Manual Syncing

You can also trigger syncs manually via API:

```bash
# Sync products to Mirakl
curl -X POST http://localhost:3000/sync/products

# Sync orders from Mirakl
curl -X POST http://localhost:3000/sync/orders

# Sync inventory to Mirakl
curl -X POST http://localhost:3000/sync/inventory
```

## Deployment Options

### Option 1: Render (Free Tier Available)

1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect your GitHub repo (push this code first)
4. Set environment variables in dashboard
5. Deploy

### Option 2: Railway (Free $5 credit)

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add environment variables
4. Deploy

### Option 3: Your Own Server (VPS)

```bash
# On your server
git clone <your-repo>
cd shopify-mirakl-integration
npm install
npm install -g pm2

# Set up .env file
nano .env

# Start with PM2 (keeps running)
pm2 start index.js --name shopify-mirakl
pm2 save
pm2 startup
```

## File Structure

```
shopify-mirakl-integration/
├── index.js              # Main application
├── mirakl-client.js      # Mirakl API wrapper
├── shopify-client.js     # Shopify API wrapper
├── integration-sync.js   # Sync logic
├── test-mirakl.js        # Test Mirakl connection
├── package.json          # Dependencies
├── .env.example          # Example environment variables
└── README.md             # This file
```

## Troubleshooting

### Connection Issues

**Mirakl API Error:**
```
Error: Request failed with status code 401
```
→ Check your API key is correct in `.env`

**Shopify API Error:**
```
Error: Access token is invalid
```
→ Regenerate Shopify access token with correct scopes

### Order Sync Issues

If orders aren't syncing:
1. Check that orders are in `WAITING_ACCEPTANCE` state in Mirakl
2. Verify SKUs match between Shopify and Mirakl
3. Check logs for specific errors

### Product Sync Issues

If products aren't appearing in Mirakl:
1. Ensure all variants have SKUs in Shopify
2. Check Mirakl category mapping requirements
3. Verify product state codes match Nordstrom's requirements

## Monitoring

Check application status:
```bash
curl http://localhost:3000/health
```

View logs:
```bash
# If using PM2
pm2 logs shopify-mirakl

# If running directly
# Logs appear in terminal
```

## Next Steps

After successful deployment:

1. ✅ Monitor first few syncs to ensure data accuracy
2. ✅ Adjust sync intervals based on order volume
3. ✅ Set up monitoring/alerting (optional)
4. ✅ Add webhook support for real-time updates (future enhancement)

## Support

For issues:
1. Check application logs
2. Verify API credentials
3. Test connections with `npm run test-mirakl`

## License

MIT
