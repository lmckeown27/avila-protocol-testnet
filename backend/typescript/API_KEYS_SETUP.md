# Backend API Keys Setup Guide

## **🚀 Complete API Keys Setup for Backend Market Data Service**

Your backend already has a comprehensive market data service with **10+ APIs configured**. Here's how to set it up:

## **📁 Create Backend Environment File**

Create a `.env` file in `backend/typescript/` directory:

```bash
# backend/typescript/.env

# ============================================================================
# TRADFI MARKET DATA APIs (FREE TIERS)
# ============================================================================

# Finnhub API (60 requests/minute free)
# Get your free key at: https://finnhub.io/register
FINNHUB_API_KEY=your_finnhub_api_key_here

# Polygon.io API (5 requests/minute free)
# Get your free key at: https://polygon.io/
POLYGON_API_KEY=your_polygon_api_key_here

# Alpha Vantage API (5 requests/minute free)
# Get your free key at: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# Twelve Data API (8 requests/minute free)
# Get your free key at: https://twelvedata.com/
TWELVE_DATA_API_KEY=your_twelve_data_api_key_here

# ============================================================================
# CRYPTO MARKET DATA APIs (FREE TIERS)
# ============================================================================

# CoinMarketCap API (10 requests/minute free)
# Get your free key at: https://coinmarketcap.com/api/
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here

# ============================================================================
# APTOS BLOCKCHAIN CONFIGURATION
# ============================================================================

# Aptos Node URLs
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com

# Smart Contract Addresses (Testnet)
AVILA_PROTOCOL_ADDRESS=0x...
COLLATERAL_VAULT_ADDRESS=0x...
OPTIONS_CORE_ADDRESS=0x...
MARGIN_ENGINE_ADDRESS=0x...
SETTLEMENT_ENGINE_ADDRESS=0x...
ORDER_BOOK_ADDRESS=0x...
PRICE_ORACLE_ADAPTER_ADDRESS=0x...
TOKENIZED_ASSET_REGISTRY_ADDRESS=0x...
COMPLIANCE_GATE_ADDRESS=0x...
GOVERNANCE_ADMIN_ADDRESS=0x...
EVENTS_AND_AUDITING_ADDRESS=0x...
MULTI_STOCK_MOCK_ADDRESS=0x...

# ============================================================================
# DEVELOPMENT SETTINGS
# ============================================================================

NODE_ENV=development
PORT=3001
HOST=localhost
LOG_LEVEL=info
CACHE_TTL=60000
MAX_CACHE_SIZE=1000
```

## **🔑 Get Free API Keys**

### **1. Finnhub API (60 requests/minute)**
- **URL**: https://finnhub.io/register
- **Coverage**: Real-time stock quotes, company data
- **Rate Limit**: 60 requests per minute

### **2. Polygon.io API (5 requests/minute)**
- **URL**: https://polygon.io/
- **Coverage**: Stock market data, options data
- **Rate Limit**: 5 requests per minute

### **3. Alpha Vantage API (5 requests/minute)**
- **URL**: https://www.alphavantage.co/support/#api-key
- **Coverage**: Stock quotes, technical indicators
- **Rate Limit**: 5 requests per minute

### **4. Twelve Data API (8 requests/minute)**
- **URL**: https://twelvedata.com/
- **Coverage**: Global market data, forex, crypto
- **Rate Limit**: 8 requests per minute

### **5. CoinMarketCap API (10 requests/minute)**
- **URL**: https://coinmarketcap.com/api/
- **Coverage**: Cryptocurrency market data
- **Rate Limit**: 10 requests per minute

## **🚀 Next Steps**

1. **Get your free API keys** from the websites above
2. **Create `.env` file** in `backend/typescript/`
3. **Install backend dependencies**: `npm install`
4. **Test the backend service**: `npm run test`
5. **Start the backend**: `npm run dev`

## **✅ Benefits of Using Backend Service**

- **Centralized API management**
- **Better rate limiting** and caching
- **More secure** (keys not exposed in frontend)
- **Unified data format** for all asset types
- **Professional architecture**
- **Easy to scale** and maintain

Your backend service is ready to go! 🎉 