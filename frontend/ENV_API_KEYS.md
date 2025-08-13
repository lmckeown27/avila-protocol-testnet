# API Keys Setup for Real Market Data

## **🚀 Get Free API Keys for Real TradFi Data**

Your Avila Protocol now uses **REAL market data** from free APIs instead of mock data. Here's how to set up your API keys:

## **🏛️ TradFi APIs (All Free Tiers)**

### **1. Finnhub API (60 requests/minute)**
- **URL**: https://finnhub.io/register
- **Free Tier**: 60 requests per minute
- **Coverage**: Real-time stock quotes, company data
- **Setup**: 
  1. Go to https://finnhub.io/register
  2. Sign up for free account
  3. Get your API key from dashboard
  4. Add to `.env.local`: `REACT_APP_FINNHUB_API_KEY=your_key`

### **2. Alpha Vantage API (5 requests/minute)**
- **URL**: https://www.alphavantage.co/support/#api-key
- **Free Tier**: 5 requests per minute
- **Coverage**: Stock quotes, technical indicators
- **Setup**:
  1. Go to https://www.alphavantage.co/support/#api-key
  2. Request free API key
  3. Add to `.env.local`: `REACT_APP_ALPHA_VANTAGE_API_KEY=your_key`

### **3. Twelve Data API (8 requests/minute)**
- **URL**: https://twelvedata.com/
- **Free Tier**: 8 requests per minute
- **Coverage**: Global market data, forex, crypto
- **Setup**:
  1. Go to https://twelvedata.com/
  2. Sign up for free account
  3. Get your API key from dashboard
  4. Add to `.env.local`: `REACT_APP_TWELVE_DATA_API_KEY=your_key`

## **📁 Environment File Setup**

Create a `.env.local` file in your `frontend` directory:

```bash
# .env.local
REACT_APP_FINNHUB_API_KEY=your_finnhub_api_key_here
REACT_APP_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
REACT_APP_TWELVE_DATA_API_KEY=your_twelve_data_api_key_here
```

## **🔧 How It Works**

1. **Primary**: Finnhub API (60 req/min) - Most reliable
2. **Fallback**: Alpha Vantage (5 req/min) - If Finnhub fails
3. **Backup**: Twelve Data (8 req/min) - If others fail
4. **Emergency**: Mock data - Only if all APIs fail

## **📊 Data Quality**

- **✅ Real-time prices** from live markets
- **✅ Actual trading volumes** and market caps
- **✅ Real high/low/open/close** data
- **✅ Live market changes** and percentages
- **✅ Real exchange information**

## **🎯 Benefits**

- **No more fake prices** - Real market data
- **Accurate trading** - Based on live market conditions
- **Professional appearance** - Real-time data looks authentic
- **Mock trading** - Still simulated for testing
- **Free forever** - No paid subscriptions needed

## **⚠️ Rate Limits**

- **Finnhub**: 60 requests/minute (best for primary use)
- **Alpha Vantage**: 5 requests/minute (good fallback)
- **Twelve Data**: 8 requests/minute (good backup)

## **🚀 Next Steps**

1. **Get your free API keys** from the websites above
2. **Create `.env.local`** with your keys
3. **Restart your dev server** to load the new environment
4. **Test the real data** on your TradFi Markets page

Your TradFi markets will now show **real, live market data** instead of generated numbers! 🎉📈 