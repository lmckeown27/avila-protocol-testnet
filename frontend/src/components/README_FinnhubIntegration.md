# Finnhub API Integration

Real-time stock market data integration using the Finnhub API for live stock quotes, company profiles, and market news.

## 🚀 Features

### **Real-Time Stock Quotes**
- **Live price updates** every 30 seconds (configurable)
- **Top 20 stocks** including AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA
- **Price changes** with visual indicators (green/red)
- **High/Low/Open prices** for comprehensive market view
- **Timestamp tracking** for data freshness

### **API Endpoints Integrated**
- **Quote endpoint**: `https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY`
- **Company profile**: `https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=YOUR_KEY`
- **Market news**: `https://finnhub.io/api/v1/news?category=general&token=YOUR_KEY`

### **Data Fields**
- **Current Price** (`c`): Real-time stock price
- **Change** (`d`): Price change from previous close
- **Change Percent** (`dp`): Percentage change
- **High Price** (`h`): Day's highest price
- **Low Price** (`l`): Day's lowest price
- **Open Price** (`o`): Opening price
- **Previous Close** (`pc`): Previous closing price

## 🛠️ Setup & Configuration

### **1. Get Finnhub API Key**
1. Visit [Finnhub.io](https://finnhub.io/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Free tier includes 60 API calls per minute

### **2. Environment Variables**
Add to your `.env.local` file:
```env
NEXT_PUBLIC_FINNHUB_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_STOCK_REFRESH_INTERVAL=30000
NEXT_PUBLIC_MAX_STOCKS_DISPLAY=20
NEXT_PUBLIC_ENABLE_FINNHUB_INTEGRATION=true
```

### **3. API Rate Limits**
- **Free tier**: 60 calls/minute
- **Premium tiers**: 1000+ calls/minute
- **Enterprise**: Custom limits

## 📱 Components

### **RealTimeStockQuotes Component**
```tsx
import RealTimeStockQuotes from './components/RealTimeStockQuotes';

// Basic usage
<RealTimeStockQuotes />

// With custom configuration
<RealTimeStockQuotes 
  maxStocks={15}
  refreshInterval={60000}
  className="my-custom-class"
/>
```

### **Props**
- `maxStocks`: Number of stocks to display (default: 10)
- `refreshInterval`: Refresh interval in milliseconds (default: 30000)
- `className`: Additional CSS classes

## 🔧 API Integration

### **FinnhubAPI Class**
```typescript
import { FinnhubAPI } from '../lib/api';

// Get single stock quote
const quote = await FinnhubAPI.getStockQuote('AAPL');

// Get multiple stock quotes
const quotes = await FinnhubAPI.getMultipleStockQuotes(['AAPL', 'MSFT', 'GOOGL']);

// Get top stocks
const topStocks = await FinnhubAPI.getTopStocksQuotes();

// Get company profile
const profile = await FinnhubAPI.getCompanyProfile('AAPL');

// Get market news
const news = await FinnhubAPI.getMarketNews('general');
```

### **Stock Quote Response**
```typescript
interface StockQuote {
  symbol: string;           // Stock symbol (e.g., "AAPL")
  currentPrice: number;     // Current market price
  change: number;           // Price change from previous close
  changePercent: number;    // Percentage change
  highPrice: number;        // Day's highest price
  lowPrice: number;         // Day's lowest price
  openPrice: number;        // Opening price
  previousClose: number;    // Previous closing price
  timestamp: number;        // Data timestamp
}
```

## 📊 Top Stocks Tracked

### **Technology**
- **AAPL** - Apple Inc.
- **MSFT** - Microsoft Corporation
- **GOOGL** - Alphabet Inc.
- **AMZN** - Amazon.com Inc.
- **TSLA** - Tesla Inc.
- **META** - Meta Platforms Inc.
- **NVDA** - NVIDIA Corporation

### **Financial**
- **JPM** - JPMorgan Chase & Co.
- **BAC** - Bank of America Corp.
- **V** - Visa Inc.
- **MA** - Mastercard Inc.

### **Healthcare**
- **JNJ** - Johnson & Johnson
- **UNH** - UnitedHealth Group Inc.
- **PFE** - Pfizer Inc.
- **ABBV** - AbbVie Inc.

### **Consumer**
- **PG** - Procter & Gamble Co.
- **HD** - Home Depot Inc.
- **KO** - Coca-Cola Co.
- **PEP** - PepsiCo Inc.

### **Other**
- **BRK.A** - Berkshire Hathaway Inc.

## 🎨 UI Features

### **Visual Indicators**
- **Green indicators** for positive price changes
- **Red indicators** for negative price changes
- **Trending arrows** (up/down) for price direction
- **Color-coded symbols** based on performance

### **Responsive Design**
- **Desktop**: Full table with all columns
- **Tablet**: Condensed table layout
- **Mobile**: Stacked card layout
- **Dark mode**: Full theme support

### **Interactive Elements**
- **Manual refresh button** with loading state
- **Hover effects** on table rows
- **Loading spinners** during data fetch
- **Error handling** with user-friendly messages

## ⚡ Performance Features

### **Auto-Refresh**
- **Configurable intervals** (default: 30 seconds)
- **Smart refresh** only when needed
- **Background updates** without user interaction
- **Efficient API calls** with rate limiting

### **Error Handling**
- **Graceful degradation** when API fails
- **Retry logic** for failed requests
- **User notifications** for errors
- **Fallback data** when available

### **Data Caching**
- **Local state management** for performance
- **Timestamp tracking** for data freshness
- **Efficient re-renders** with React optimization
- **Memory management** with proper cleanup

## 🔒 Security & Best Practices

### **API Key Management**
- **Environment variables** for sensitive data
- **Client-side only** for public keys
- **Rate limiting** to prevent abuse
- **Error masking** to avoid information leakage

### **Data Validation**
- **Type checking** for API responses
- **Error handling** for malformed data
- **Fallback values** for missing data
- **Input sanitization** for user inputs

## 📈 Market Data Integration

### **MarketOverviewDashboard**
The Finnhub integration is automatically used in the main dashboard:
- **Total Market Overview**: Uses real stock data for calculations
- **TradFi Market Overview**: Enhanced with live stock quotes
- **Real-time updates**: Automatic data refresh

### **Data Flow**
```
Finnhub API → Data Processing → Market Metrics → Dashboard Display
     ↓
HTTP Fallback → Alternative APIs → Market Metrics → Dashboard Display
     ↓
Mock Data → Fallback Values → Market Metrics → Dashboard Display
```

## 🚨 Error Handling

### **Common Issues**
1. **API rate limit exceeded** → Automatic retry with backoff
2. **Network timeout** → Fallback to alternative APIs
3. **Invalid API key** → Clear error message with setup instructions
4. **Data parsing errors** → Graceful degradation with mock data

### **User Experience**
- **Loading states** during data fetch
- **Error banners** with actionable messages
- **Last updated timestamps** for data freshness
- **Manual refresh options** for user control

## 🔄 Customization

### **Stock Selection**
Modify `TOP_STOCKS` array in `api.ts`:
```typescript
const TOP_STOCKS = [
  'YOUR_STOCK_1', 'YOUR_STOCK_2', 'YOUR_STOCK_3'
];
```

### **Refresh Intervals**
Adjust environment variables:
```env
NEXT_PUBLIC_STOCK_REFRESH_INTERVAL=15000  # 15 seconds
NEXT_PUBLIC_STOCK_REFRESH_INTERVAL=60000  # 1 minute
```

### **Display Options**
Customize component props:
```tsx
<RealTimeStockQuotes 
  maxStocks={25}           // Show more stocks
  refreshInterval={45000}   // 45-second refresh
  className="custom-style"  // Custom styling
/>
```

## 📊 Data Accuracy

### **Real-Time Updates**
- **Market hours**: Live data during trading sessions
- **After hours**: Extended hours data when available
- **Weekends**: Last available data from Friday
- **Holidays**: Previous trading day data

### **Data Sources**
- **Primary**: Finnhub real-time feed
- **Secondary**: Financial Modeling Prep API
- **Fallback**: Mock data with realistic values
- **Validation**: Cross-reference with data sources

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

### **Finnhub Support**
- **Documentation**: [Finnhub.io/docs](https://finnhub.io/docs)
- **API Status**: [Finnhub.io/status](https://finnhub.io/status)
- **Community**: [Finnhub.io/community](https://finnhub.io/community)

### **Common Solutions**
1. **API key not working** → Check key validity and rate limits
2. **Data not updating** → Verify network connectivity and API status
3. **Rate limit errors** → Upgrade plan or reduce refresh frequency
4. **Component not rendering** → Check console for error messages

## 🔮 Future Enhancements

### **Planned Features**
- **WebSocket integration** for real-time streaming
- **Historical data charts** with time series
- **Custom stock watchlists** for users
- **Price alerts** and notifications
- **Portfolio tracking** with user holdings

### **API Expansions**
- **Options data** for derivatives markets
- **Futures data** for commodity markets
- **Forex data** for currency markets
- **Crypto data** for digital assets
- **Economic indicators** for macro analysis

---

**Built with ❤️ for real-time market data tracking** 