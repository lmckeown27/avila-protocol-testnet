# MarketOverviewDashboard Component

A comprehensive Next.js + TypeScript component that provides real-time market data with WebSocket connections and HTTP fallback logic.

## 🚀 Features

### **Real-Time Data**
- **WebSocket connections** to multiple market data sources
- **Automatic fallback** to HTTP polling when WebSocket fails
- **Live status indicators** showing data source health
- **Real-time updates** for market metrics

### **Three Market Overviews**
1. **Total Market Overview** - Global market indices and sentiment
2. **TradFi Market Overview** - Traditional finance markets (stocks, bonds, commodities)
3. **DeFi Market Overview** - Decentralized finance protocols and tokens

### **Fault-Tolerant Architecture**
- **5-second timeout** before switching to HTTP fallback
- **15-second polling** when in fallback mode
- **Automatic reconnection** attempts every 5 seconds
- **Graceful degradation** ensures UI never crashes

## 📊 Data Sources

### **WebSocket Sources**
- **Polygon.io** - Stock market data and indices
- **Trading Economics** - Bond and commodity markets
- **Finnhub** - Forex market data
- **DexScreener** - DeFi token prices and liquidity

### **HTTP Fallback APIs**
- **Financial Modeling Prep** - Stock market data
- **Alpha Vantage** - Commodity and bond data
- **ExchangeRate.host** - Forex data
- **DeFi Llama** - Protocol TVL data
- **CoinGecko** - DeFi token data
- **Alternative.me** - Market sentiment (Fear & Greed Index)

## 🛠️ Installation & Setup

### **1. Install Dependencies**
```bash
npm install lucide-react
```

### **2. Environment Variables**
Create a `.env.local` file in your project root:
```env
# Required API Keys
NEXT_PUBLIC_FMP_API_KEY=your_fmp_api_key_here
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key_here

# Optional Configuration
NEXT_PUBLIC_WEBSOCKET_ENABLED=true
NEXT_PUBLIC_WEBSOCKET_RECONNECT_INTERVAL=5000
NEXT_PUBLIC_HTTP_FALLBACK_INTERVAL=15000
```

### **3. API Key Setup**
- **Financial Modeling Prep**: [Sign up here](https://financialmodelingprep.com/developer)
- **Alpha Vantage**: [Sign up here](https://www.alphavantage.co/support/#api-key)
- **Finnhub**: [Sign up here](https://finnhub.io/register)

## 📱 Usage

### **Basic Implementation**
```tsx
import MarketOverviewDashboard from './components/MarketOverviewDashboard';

export default function MarketsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <MarketOverviewDashboard />
    </div>
  );
}
```

### **With Custom Styling**
```tsx
<MarketOverviewDashboard className="max-w-7xl mx-auto" />
```

### **In Layout**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2">
    <MarketOverviewDashboard />
  </div>
  <div className="lg:col-span-1">
    {/* Sidebar content */}
  </div>
</div>
```

## 🎨 UI Components

### **Status Indicators**
- **🟢 Live Badge** - WebSocket connected, real-time data
- **🟡 Polling Badge** - HTTP fallback mode
- **Connection Status** - Shows current data source health

### **Market Cards**
- **Market Cap** - Total market capitalization with 24h change
- **24h Volume** - Trading volume with percentage change
- **Market Sentiment** - Fear & Greed index with color coding
- **Active Markets** - Number of active trading pairs
- **Price Change** - Average price movement
- **Volatility** - Market volatility indicator

### **Responsive Design**
- **Desktop**: 3-column grid layout
- **Tablet**: 2-column grid layout
- **Mobile**: Stacked card layout
- **Dark Mode**: Full dark theme support

## 🔧 Technical Architecture

### **Data Flow**
```
WebSocket → Data Processing → UI Update
    ↓
HTTP Fallback → Data Fetching → UI Update
    ↓
Error Handling → Graceful Degradation
```

### **State Management**
- **React Hooks** for local state
- **useDataSourceManager** for data coordination
- **Automatic cleanup** on component unmount

### **Performance Features**
- **Debounced updates** to prevent excessive re-renders
- **Message queuing** for offline scenarios
- **Efficient reconnection** with exponential backoff

## 📈 Data Structure

### **Market Metrics**
```typescript
interface MarketMetrics {
  marketCap?: number;           // Total market capitalization
  marketCapChange?: number;     // 24h percentage change
  volume?: number;              // 24h trading volume
  volumeChange?: number;        // Volume percentage change
  sentiment?: string;           // Market sentiment label
  sentimentValue?: number;      // Sentiment score (0-100)
  activeMarkets?: number;       // Number of active markets
  totalMarkets?: number;        // Total available markets
  priceChange?: number;         // Average price change
  volatility?: number;          // Market volatility
}
```

### **Data Categories**
```typescript
interface MarketData {
  total?: MarketMetrics;        // Total market overview
  tradfi?: MarketMetrics;       // Traditional finance
  defi?: MarketMetrics;         // Decentralized finance
}
```

## 🚨 Error Handling

### **Graceful Degradation**
- **WebSocket failures** → HTTP fallback
- **API rate limits** → Mock data display
- **Network issues** → Cached data with warnings
- **Component errors** → Error boundaries

### **User Notifications**
- **Warning banners** for data source issues
- **Status indicators** for connection health
- **Last updated timestamps** for data freshness

## 🔄 Customization

### **Styling**
```tsx
// Custom Tailwind classes
<MarketOverviewDashboard className="bg-gray-50 rounded-xl p-6" />

// Dark mode support
<div className="dark:bg-gray-900">
  <MarketOverviewDashboard />
</div>
```

### **Data Sources**
Modify `WEBSOCKET_CONFIGS` in `websocket.ts`:
```typescript
export const WEBSOCKET_CONFIGS = {
  customSource: {
    websocketUrl: 'wss://your-websocket-url',
    httpFallbackUrl: 'https://your-api-endpoint',
    reconnectInterval: 5000,
    fallbackInterval: 15000
  }
};
```

### **API Endpoints**
Update `API_CONFIG` in `api.ts`:
```typescript
const API_CONFIG = {
  customAPI: {
    baseUrl: 'https://your-api.com',
    apiKey: process.env.NEXT_PUBLIC_CUSTOM_API_KEY
  }
};
```

## 📊 Mock Data

### **Fallback Scenarios**
- **API key missing** → Mock data with demo values
- **Rate limit exceeded** → Mock data with realistic values
- **Network timeout** → Mock data with cached values

### **Mock Data Sources**
- **Total Market**: $100T market cap, 500 active markets
- **TradFi**: $85T market cap, 750 active markets
- **DeFi**: $15T market cap, 200 active markets

## 🧪 Testing

### **Development Mode**
```bash
npm run dev
```
- WebSocket connections will attempt to connect
- HTTP fallbacks will use demo API keys
- Mock data will display if APIs fail

### **Production Mode**
```bash
npm run build
npm start
```
- Real API keys required
- WebSocket connections optimized
- Error handling production-ready

## 🔒 Security Considerations

### **API Key Management**
- **Environment variables** for sensitive keys
- **Client-side only** for public keys
- **Rate limiting** to prevent abuse
- **Error masking** to avoid information leakage

### **Data Validation**
- **Input sanitization** for WebSocket messages
- **Type checking** for API responses
- **Error boundaries** for component crashes

## 📚 Dependencies

### **Core Dependencies**
- **React 18+** - Component framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### **External Dependencies**
- **lucide-react** - Icons
- **WebSocket API** - Real-time connections
- **Fetch API** - HTTP requests

## 🚀 Deployment

### **Vercel**
```bash
vercel --prod
```
- Environment variables automatically loaded
- WebSocket connections work in production
- Edge functions for optimal performance

### **Netlify**
```bash
netlify deploy --prod
```
- Environment variables in Netlify dashboard
- WebSocket connections supported
- Static site generation compatible

## 📞 Support

### **Common Issues**
1. **WebSocket not connecting** → Check network/firewall
2. **API rate limits** → Upgrade API plan or use demo keys
3. **Data not updating** → Check browser console for errors
4. **Component not rendering** → Verify TypeScript compilation

### **Debugging**
- **Browser console** for connection logs
- **Network tab** for API requests
- **React DevTools** for component state
- **WebSocket tab** for real-time connections

## 🔮 Future Enhancements

### **Planned Features**
- **Chart integration** with Recharts/Chart.js
- **Historical data** with time series charts
- **Custom alerts** for price movements
- **Portfolio integration** with user holdings
- **News feed** integration for market context

### **API Expansions**
- **More exchanges** for comprehensive coverage
- **Options data** for derivatives markets
- **Futures data** for commodity markets
- **Crypto data** for digital asset markets

---

**Built with ❤️ for the Avila Protocol team** 