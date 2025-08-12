# Polygon.io API Integration

Comprehensive TypeScript module for integrating with Polygon.io REST API to fetch both stock and options data with full type safety and error handling.

## 🚀 Features

### **Stock Data Endpoints**
- **Tickers List**: Get all available tickers with filtering options
- **Historical OHLC**: Fetch aggregated price data for any time period
- **Last Trade**: Real-time last trade information
- **Last Quote**: Current bid/ask quotes with spread calculation

### **Options Data Endpoints**
- **Options Contracts**: Detailed contract information and filtering
- **Options Chain Snapshot**: Complete options chain with Greeks and IV
- **Expiration Filtering**: Filter options by specific expiration dates
- **Implied Volatility**: Extract IV data for specific contracts

### **Advanced Features**
- **Type Safety**: Full TypeScript interfaces for all API responses
- **Error Handling**: Comprehensive error handling with detailed messages
- **Rate Limiting**: Built-in timeout and request management
- **Utility Functions**: Helper functions for common operations

## 🛠️ Setup & Configuration

### **1. Get Polygon.io API Key**
1. Visit [Polygon.io](https://polygon.io/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Free tier includes 5 API calls per minute

### **2. Environment Variables**
Add to your `.env.local` file:
```env
NEXT_PUBLIC_POLYGON_API_KEY=your_actual_polygon_api_key_here
NEXT_PUBLIC_POLYGON_TIMEOUT=10000
NEXT_PUBLIC_POLYGON_MAX_RESULTS=1000
NEXT_PUBLIC_ENABLE_POLYGON_INTEGRATION=true
```

### **3. Install Dependencies**
```bash
npm install axios
```

## 📊 API Endpoints Implemented

### **STOCKS**

#### **1. GET /v3/reference/tickers**
```typescript
import { getTickers } from '../lib/polygonApi';

// Get all active stock tickers
const tickers = await getTickers('stocks', 'CS', true, 1000, 'ticker', 'asc');

// Get specific market tickers
const crypto = await getTickers('crypto', undefined, true, 500);
```

**Parameters:**
- `market`: Market filter ('stocks', 'crypto', 'fx')
- `type`: Type filter ('CS', 'ETF', 'ADRC')
- `active`: Filter by active status
- `limit`: Number of results (max 1000)
- `sort`: Sort field ('ticker', 'name', 'market')
- `order`: Sort order ('asc' or 'desc')

#### **2. GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}**
```typescript
import { getAggregates } from '../lib/polygonApi';

// Get daily OHLC for AAPL for the last 30 days
const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const to = new Date().toISOString().split('T')[0];

const aggregates = await getAggregates('AAPL', 1, 'day', from, to, true, 'asc', 30);
```

**Parameters:**
- `ticker`: Stock ticker symbol
- `multiplier`: Timespan multiplier (e.g., 1, 5, 15)
- `timespan`: Time window ('minute', 'hour', 'day', 'week', 'month', 'quarter', 'year')
- `from`: Start date (ISO 8601 format)
- `to`: End date (ISO 8601 format)
- `adjusted`: Whether results are adjusted for splits
- `sort`: Sort order ('asc' or 'desc')
- `limit`: Number of results (max 50000)

#### **3. GET /v2/last/trade/{ticker}**
```typescript
import { getLastTrade } from '../lib/polygonApi';

// Get last trade for AAPL
const lastTrade = await getLastTrade('AAPL');
console.log(`Last trade: $${lastTrade.results.price} at ${new Date(lastTrade.results.timestamp)}`);
```

#### **4. GET /v2/last/quote/{ticker}**
```typescript
import { getLastQuote } from '../lib/polygonApi';

// Get last quote for AAPL
const lastQuote = await getLastQuote('AAPL');
console.log(`Bid: $${lastQuote.results.bid}, Ask: $${lastQuote.results.ask}`);
```

### **OPTIONS**

#### **5. GET /v3/reference/options/contracts/{optionsTicker}**
```typescript
import { getOptionsContracts } from '../lib/polygonApi';

// Get all options contracts for AAPL
const contracts = await getOptionsContracts(undefined, 'AAPL', 'call', '2024-01-19');

// Get specific contract details
const contract = await getOptionsContracts('O:AAPL240119C00150000');
```

**Parameters:**
- `optionsTicker`: Options contract ticker (optional)
- `underlyingTicker`: Underlying stock ticker
- `contractType`: Contract type ('call' or 'put')
- `expirationDate`: Expiration date (YYYY-MM-DD format)
- `strikePrice`: Strike price filter
- `limit`: Number of results (max 1000)

#### **6. GET /v3/snapshot/options/{underlyingTicker}**
```typescript
import { getOptionsSnapshot } from '../lib/polygonApi';

// Get complete options chain for AAPL
const optionsChain = await getOptionsSnapshot('AAPL');

// Access specific option data
const callOption = optionsChain.results.options['150']['2024-01-19']['call'];
console.log(`IV: ${callOption.implied_volatility}, Delta: ${callOption.greeks.delta}`);
```

## 🔧 Utility Functions

### **Stock Utilities**
```typescript
import { getCurrentStockPrice, getCurrentStockQuote } from '../lib/polygonApi';

// Get current stock price
const price = await getCurrentStockPrice('AAPL');

// Get current quote with spread
const quote = await getCurrentStockQuote('AAPL');
console.log(`Spread: $${quote.spread}`);
```

### **Options Utilities**
```typescript
import { getOptionsChainForExpiration, getImpliedVolatility } from '../lib/polygonApi';

// Get options chain for specific expiration
const janChain = await getOptionsChainForExpiration('AAPL', '2024-01-19');

// Get implied volatility for specific contract
const iv = await getImpliedVolatility('AAPL', 150, '2024-01-19', 'call');
```

## 📈 Data Types

### **Stock Data Interfaces**
```typescript
interface PolygonTicker {
  ticker: string;
  name: string;
  market: string;
  active: boolean;
  market_cap?: number;
  // ... more fields
}

interface PolygonAggregate {
  c: number; // Close price
  h: number; // High price
  l: number; // Low price
  o: number; // Open price
  v: number; // Volume
  t: number; // Timestamp
}

interface PolygonTrade {
  price: number;
  size: number;
  timestamp: number;
  exchange: number;
  conditions: number[];
}

interface PolygonQuote {
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  lastUpdated: number;
}
```

### **Options Data Interfaces**
```typescript
interface PolygonOptionsContract {
  underlying_ticker: string;
  contract_type: string;
  expiration_date: string;
  strike_price: number;
  shares_per_contract: number;
  active: boolean;
}

interface PolygonOptionsSnapshot {
  underlying_ticker: string;
  underlying_price: number;
  options: {
    [strikePrice: string]: {
      [expirationDate: string]: {
        [contractType: string]: {
          ticker: string;
          last_quote: PolygonQuote;
          last_trade: PolygonTrade;
          greeks: {
            delta: number;
            gamma: number;
            theta: number;
            vega: number;
          };
          implied_volatility: number;
          open_interest: number;
          volume: number;
        };
      };
    };
  };
}
```

## ⚡ Performance Features

### **Request Optimization**
- **Timeout handling**: 10-second request timeout
- **Rate limiting**: Respects Polygon.io rate limits
- **Error recovery**: Automatic retry with backoff
- **Caching**: Built-in response caching (can be extended)

### **Data Processing**
- **Type validation**: Ensures data integrity
- **Error handling**: Graceful degradation on failures
- **Memory management**: Efficient data structures
- **Async operations**: Non-blocking API calls

## 🔒 Error Handling

### **Comprehensive Error Types**
```typescript
interface PolygonApiError {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}
```

### **Error Scenarios Handled**
- **API rate limits**: Clear error messages with retry guidance
- **Network timeouts**: Automatic timeout handling
- **Invalid responses**: Data validation and error reporting
- **Authentication failures**: Clear API key error messages

### **Error Recovery**
```typescript
try {
  const data = await getTickers('stocks', 'CS', true);
  // Process data
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Handle rate limiting
    console.log('Rate limit exceeded, retrying later...');
  } else if (error.message.includes('API key')) {
    // Handle authentication errors
    console.log('Invalid API key, check configuration');
  } else {
    // Handle other errors
    console.error('Unexpected error:', error.message);
  }
}
```

## 🎯 Use Cases

### **Stock Analysis**
```typescript
// Get historical data for technical analysis
const dailyData = await getAggregates('AAPL', 1, 'day', '2024-01-01', '2024-01-31');

// Calculate moving averages
const prices = dailyData.results.map(bar => bar.c);
const sma20 = prices.slice(-20).reduce((sum, price) => sum + price, 0) / 20;
```

### **Options Trading**
```typescript
// Get options chain for analysis
const optionsChain = await getOptionsSnapshot('AAPL');

// Find high IV options
const highIVOptions = [];
Object.keys(optionsChain.results.options).forEach(strike => {
  Object.keys(optionsChain.results.options[strike]).forEach(expiry => {
    Object.keys(optionsChain.results.options[strike][expiry]).forEach(type => {
      const option = optionsChain.results.options[strike][expiry][type];
      if (option.implied_volatility > 0.5) {
        highIVOptions.push({
          strike: parseFloat(strike),
          expiry,
          type,
          iv: option.implied_volatility
        });
      }
    });
  });
});
```

### **Market Data Dashboard**
```typescript
// Get multiple stock quotes for dashboard
const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];
const quotes = await Promise.all(
  tickers.map(ticker => getCurrentStockQuote(ticker))
);

// Display in UI
quotes.forEach((quote, index) => {
  console.log(`${tickers[index]}: Bid $${quote.bid}, Ask $${quote.ask}, Spread $${quote.spread}`);
});
```

## 🔄 Customization

### **Configuration Options**
```typescript
import { polygonConfig } from '../lib/polygonApi';

// Access configuration
console.log(`API Key: ${polygonConfig.apiKey}`);
console.log(`Base URL: ${polygonConfig.baseUrl}`);
console.log(`Timeout: ${polygonConfig.timeout}ms`);
```

### **Extending the Module**
```typescript
// Add custom endpoints
export async function getCustomEndpoint(param: string): Promise<any> {
  return polygonGetRequest<any>('/v3/custom/endpoint', { param });
}

// Add custom error handling
export async function getWithCustomErrorHandling(ticker: string): Promise<any> {
  try {
    return await getLastTrade(ticker);
  } catch (error) {
    // Custom error handling logic
    console.error(`Custom error for ${ticker}:`, error);
    throw new Error(`Custom error message for ${ticker}`);
  }
}
```

## 🧪 Testing

### **Development Mode**
```bash
npm run dev
```
- API calls will use demo keys
- Mock data will display if APIs fail
- Console logging for debugging

### **Production Mode**
```bash
npm run build
npm start
```
- Real API keys required
- Production error handling
- Performance optimization

## 📞 Support

### **Polygon.io Support**
- **Documentation**: [Polygon.io/docs](https://polygon.io/docs)
- **API Status**: [Polygon.io/status](https://polygon.io/status)
- **Community**: [Polygon.io/community](https://polygon.io/community)

### **Common Solutions**
1. **API rate limit exceeded** → Implement exponential backoff
2. **Invalid API key** → Check environment variable configuration
3. **Network timeout** → Increase timeout value in configuration
4. **Data parsing errors** → Verify API response format

## 🔮 Future Enhancements

### **Planned Features**
- **WebSocket integration** for real-time streaming
- **Historical data caching** with Redis
- **Batch request optimization** for multiple tickers
- **Advanced filtering** with complex queries
- **Data validation schemas** with Zod

### **API Expansions**
- **Forex data** for currency markets
- **Crypto data** for digital assets
- **Indices data** for market benchmarks
- **Economic indicators** for macro analysis
- **News and sentiment** data integration

---

**Built with ❤️ for comprehensive market data access** 