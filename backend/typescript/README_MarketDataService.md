# Market Data Service for Avila Protocol

A comprehensive TypeScript backend module that fetches and normalizes market data from multiple free APIs for a mock decentralized options platform.

## 🚀 Features

- **Multi-Source Data Fetching**: Integrates with 10+ free financial APIs
- **Automatic Fallback Logic**: Seamlessly switches between data sources
- **Real-Time Polling**: Configurable polling intervals for live updates
- **Data Normalization**: Consistent data format across all sources
- **Smart Caching**: 30-second cache TTL for performance optimization
- **Error Resilience**: Graceful degradation when APIs fail
- **TypeScript Support**: Full type safety and IntelliSense

## 📊 Supported Data Sources

### TradFi Markets
- **Finnhub.io**: Real-time stock quotes and market data
- **Polygon.io**: Last trade data for stocks and ETFs
- **Alpha Vantage**: Intraday time series data
- **Twelve Data**: Real-time market data feeds

### Cryptocurrency Markets
- **CoinGecko**: Comprehensive crypto market data
- **CoinMarketCap**: Professional crypto analytics
- **CryptoCompare**: Real-time crypto prices
- **Binance**: Exchange-specific market data

### DeFi Protocols
- **DefiLlama**: Total Value Locked (TVL) metrics
- **Uniswap Subgraph**: DEX trading data
- **Aave**: Lending protocol metrics
- **Compound**: DeFi lending analytics

### Market Sentiment
- **Alternative.me**: Crypto Fear & Greed Index
- **Finnhub**: News sentiment analysis

## 🛠️ Installation

```bash
cd backend/typescript
npm install
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend/typescript` directory:

```env
# TradFi APIs
FINNHUB_API_KEY=your_finnhub_token
POLYGON_API_KEY=your_polygon_token
ALPHA_VANTAGE_API_KEY=your_alphavantage_token
TWELVE_DATA_API_KEY=your_twelvedata_token

# Crypto APIs
COINMARKETCAP_API_KEY=your_coinmarketcap_token

# Optional: Custom polling intervals
POLLING_INTERVAL=30000
CACHE_TTL=30000
```

### API Keys (Free Tiers Available)

- **Finnhub**: [Get Free API Key](https://finnhub.io/register)
- **Polygon**: [Get Free API Key](https://polygon.io/register)
- **Alpha Vantage**: [Get Free API Key](https://www.alphavantage.co/support/#api-key)
- **Twelve Data**: [Get Free API Key](https://twelvedata.com/register)
- **CoinMarketCap**: [Get Free API Key](https://coinmarketcap.com/api/)

## 📖 Usage

### Basic Usage

```typescript
import { marketDataService, getMarketData } from './marketDataService';

// Get all market data
const marketData = await marketDataService.getAllMarketData();
console.log(`TradFi: ${marketData.tradfi.length} assets`);
console.log(`DeFi: ${marketData.defi.length} assets`);

// Or use the exported function
const data = await getMarketData();
```

### Advanced Usage

```typescript
import { marketDataService } from './marketDataService';

// Start real-time polling
marketDataService.startPolling((data) => {
  console.log('New market data received:', data.timestamp);
  console.log('TradFi assets:', data.tradfi.length);
  console.log('DeFi assets:', data.defi.length);
});

// Stop polling
marketDataService.stopPolling();

// Get specific data types
const tradfiData = await marketDataService.getTradFiData();
const defiData = await marketDataService.getDeFiData();

// Cache management
const cacheStats = marketDataService.getCacheStats();
marketDataService.clearCache();
```

### Data Structure

```typescript
interface NormalizedAsset {
  asset: string;           // Asset name
  symbol: string;          // Trading symbol
  name?: string;           // Full asset name
  price: number;           // Current price
  change24h: number;       // 24h price change
  volume24h: number;       // 24h trading volume
  marketCap: number;       // Market capitalization
  source: string;          // Data source name
  lastUpdated: number;     // Timestamp
  high24h?: number;        // 24h high price
  low24h?: number;         // 24h low price
  open24h?: number;        // 24h open price
}

interface MarketDataResponse {
  tradfi: NormalizedAsset[];    // Traditional finance assets
  defi: NormalizedAsset[];      // DeFi protocol assets
  timestamp: number;             // Response timestamp
  dataSources: string[];        // Active data sources
  errors: string[];             // Any errors encountered
}
```

## 🔄 Real-Time Updates

### WebSocket Support (Future Enhancement)

```typescript
// Planned WebSocket integration
marketDataService.connectWebSocket({
  finnhub: true,    // Finnhub WebSocket
  binance: true,    // Binance WebSocket
  onMessage: (data) => {
    console.log('Real-time update:', data);
  }
});
```

### Polling Configuration

```typescript
// Custom polling intervals
marketDataService.startPolling(
  (data) => console.log('Update received'),
  15000  // 15 seconds
);

// Multiple callbacks
marketDataService.startPolling((data) => {
  // Update UI
  updateDashboard(data);
  
  // Store data
  saveToDatabase(data);
  
  // Send notifications
  checkAlerts(data);
});
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- marketDataService.test.ts
```

## 📈 Performance Optimization

### Caching Strategy

- **TTL**: 30 seconds for market data
- **Memory**: In-memory Map storage
- **Hit Rate**: Automatic cache statistics

### Rate Limiting

- **Finnhub**: 60 requests/minute
- **Polygon**: 5 requests/minute
- **Alpha Vantage**: 5 requests/minute
- **Twelve Data**: 8 requests/minute
- **CoinGecko**: 50 requests/minute
- **Binance**: 1200 requests/minute

### Fallback Logic

1. **Primary Source**: Try first API
2. **Secondary Source**: Try second API if first fails
3. **Tertiary Source**: Try third API if second fails
4. **Fallback Data**: Use simulated data if all APIs fail

## 🚨 Error Handling

### Automatic Fallback

```typescript
try {
  const data = await marketDataService.getTradFiData();
  // Use real data
} catch (error) {
  // Automatically falls back to mock data
  console.log('Using fallback data due to API failure');
}
```

### Error Types

- **Network Errors**: Connection timeouts, DNS failures
- **API Errors**: Rate limits, authentication failures
- **Data Errors**: Invalid responses, missing fields
- **Timeout Errors**: Request timeouts (5-10 seconds)

## 🔒 Security Considerations

- **API Keys**: Store in environment variables
- **Rate Limiting**: Respect API provider limits
- **Data Validation**: Sanitize all incoming data
- **Error Logging**: Avoid exposing sensitive information

## 📊 Monitoring & Logging

### Console Output

```bash
🔄 Fetching all market data...
✅ Market data fetched: 20 TradFi, 15 DeFi assets
⚠️ Finnhub fetch failed: Rate limit exceeded
🔄 Starting market data polling...
⏹️ Stopped market data polling
🗑️ Cache cleared
```

### Cache Statistics

```typescript
const stats = marketDataService.getCacheStats();
console.log(stats);
// Output: { size: 2, keys: ['tradfi', 'defi'], hitRate: 0.8 }
```

## 🚀 Deployment

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start dist/marketDataService.js --name "market-data-service"
```

### Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add new data sources or improve existing ones
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review API provider documentation

## 🔮 Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Database persistence for historical data
- [ ] Advanced caching with Redis
- [ ] Machine learning price predictions
- [ ] Custom alert system
- [ ] Data export functionality
- [ ] Performance metrics dashboard
- [ ] Multi-region deployment support 