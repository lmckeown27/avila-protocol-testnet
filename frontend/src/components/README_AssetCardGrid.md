# Asset Card Grid Component

A comprehensive React/TypeScript component for displaying TradFi, Crypto, and DeFi assets in an interactive card grid with hover effects, responsive design, and real-time data integration capabilities.

## 🚀 Features

### **Core Functionality**
- **Interactive Card Grid**: Each asset displayed in its own card with hover effects
- **Responsive Design**: CSS Grid with auto-fill and minmax for perfect responsive behavior
- **Real-time Search**: Live filtering across asset names, symbols, and sources
- **Loading States**: Skeleton loading animations and graceful empty state handling
- **Click Handlers**: Customizable click events for each asset card

### **Visual Design**
- **Dark Theme**: Beautiful dark theme with gradient backgrounds
- **Hover Effects**: Smooth transform animations (translateY, scale) with 0.2s transitions
- **Color Coding**: Green for positive changes, red for negative changes
- **Source Badges**: Color-coded badges for different data sources
- **Professional Layout**: Clean, modern appearance suitable for production

### **Data Integration**
- **Flexible Data Structure**: Accepts normalized asset objects
- **Multiple Asset Types**: TradFi, Crypto, and DeFi assets supported
- **Source Attribution**: Visual indicators for data source
- **Timestamp Display**: Last updated information when available

## 📦 Installation

The component is already included in your project. Import it directly:

```typescript
import AssetCardGrid, { AssetCardData } from './components/AssetCardGrid';
```

## 🎯 Usage

### **Basic Usage**

```typescript
import AssetCardGrid, { AssetCardData } from './components/AssetCardGrid';

const MyComponent = () => {
  const assets: AssetCardData[] = [
    {
      asset: 'Apple Inc.',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.43,
      change24h: 2.34,
      volume24h: 45678900,
      marketCap: 2750000000000,
      source: 'Finnhub',
      lastUpdated: Date.now()
    }
    // ... more assets
  ];

  const handleCardClick = (asset: AssetCardData) => {
    console.log('Asset clicked:', asset);
    // Navigate to detail page, open modal, etc.
  };

  return (
    <AssetCardGrid
      assets={assets}
      title="Market Assets"
      subtitle="Real-time market data"
      onCardClick={handleCardClick}
    />
  );
};
```

### **Advanced Usage with Loading States**

```typescript
const [assets, setAssets] = useState<AssetCardData[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await marketDataService.getAllMarketData();
      setAssets([...data.tradfi, ...data.defi]);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchAssets();
}, []);

return (
  <AssetCardGrid
    assets={assets}
    title="All Market Assets"
    subtitle="Combined TradFi and DeFi data"
    loading={loading}
    emptyMessage="No market data available at the moment"
    onCardClick={(asset) => {
      // Handle asset selection
      navigate(`/asset/${asset.symbol}`);
    }}
    className="my-custom-class"
  />
);
```

## 🔧 Props

### **AssetCardGridProps**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `assets` | `AssetCardData[]` | **Required** | Array of asset objects to display |
| `title` | `string` | `'Market Assets'` | Main title for the grid |
| `subtitle` | `string` | `'Real-time market data from multiple sources'` | Subtitle description |
| `loading` | `boolean` | `false` | Shows loading skeleton when true |
| `emptyMessage` | `string` | `'No assets available'` | Message when no assets exist |
| `onCardClick` | `(asset: AssetCardData) => void` | `undefined` | Callback when card is clicked |
| `className` | `string` | `''` | Additional CSS classes |

### **AssetCardData Interface**

```typescript
interface AssetCardData {
  asset: string;           // Asset name (required)
  price: number;           // Current price (required)
  change24h: number;       // 24h price change (required)
  volume24h: number;       // 24h trading volume (required)
  marketCap: number;       // Market capitalization (required)
  source: string;          // Data source name (required)
  symbol?: string;         // Trading symbol (optional)
  name?: string;           // Full asset name (optional)
  lastUpdated?: number;    // Timestamp (optional)
}
```

## 🎨 Styling

### **CSS Classes Used**

The component uses **Tailwind CSS** classes for styling:

- **Grid Layout**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`
- **Card Design**: `bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6`
- **Hover Effects**: `hover:bg-slate-700 transition-all duration-200`
- **Responsive Breakpoints**: `sm:`, `lg:`, `xl:` prefixes

### **Custom Styling**

You can override styles using the `className` prop:

```typescript
<AssetCardGrid
  assets={assets}
  className="my-custom-grid bg-gradient-to-r from-blue-900 to-purple-900"
/>
```

### **Dark Theme Support**

The component is designed with dark theme in mind:
- **Background**: `from-slate-800 to-slate-900`
- **Text**: `text-white`, `text-slate-400`
- **Borders**: `border-slate-700/50`
- **Hover States**: `hover:bg-slate-700`

## 🔄 Data Integration

### **With Market Data Service**

```typescript
import { marketDataService } from '../services/marketDataService';

const MarketPage = () => {
  const [marketData, setMarketData] = useState<MarketDataResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await marketDataService.getAllMarketData();
        setMarketData(data);
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!marketData) return null;

  return (
    <div className="space-y-8">
      {/* TradFi Assets */}
      <AssetCardGrid
        assets={marketData.tradfi}
        title="Traditional Finance"
        subtitle="Stocks, ETFs, and indices"
        loading={loading}
      />
      
      {/* DeFi Assets */}
      <AssetCardGrid
        assets={marketData.defi}
        title="DeFi Protocols"
        subtitle="Decentralized finance assets"
        loading={loading}
      />
    </div>
  );
};
```

### **With Real-time Updates**

```typescript
const [assets, setAssets] = useState<AssetCardData[]>([]);

useEffect(() => {
  // Start real-time polling
  const cleanup = marketDataService.startPolling((data) => {
    setAssets([...data.tradfi, ...data.defi]);
  });

  return cleanup;
}, []);
```

## 📱 Responsive Behavior

### **Grid Breakpoints**

- **Mobile**: 1 column (`grid-cols-1`)
- **Small**: 2 columns (`sm:grid-cols-2`)
- **Large**: 3 columns (`lg:grid-cols-3`)
- **Extra Large**: 4 columns (`xl:grid-cols-4`)

### **Card Adaptations**

- **Mobile**: Optimized spacing and touch targets
- **Tablet**: Balanced layout with readable text
- **Desktop**: Full information display with hover effects

## 🎭 Interactive Features

### **Hover Effects**

- **Transform**: `translateY(-5px)` and `scale(1.02)`
- **Shadow**: Enhanced shadow on hover
- **Overlay**: Subtle gradient overlay
- **Duration**: 0.2s smooth transitions

### **Click Handling**

```typescript
const handleCardClick = (asset: AssetCardData) => {
  // Navigate to detail page
  navigate(`/asset/${asset.symbol}`);
  
  // Open modal
  setSelectedAsset(asset);
  setIsModalOpen(true);
  
  // Track analytics
  analytics.track('asset_card_clicked', { asset: asset.symbol });
};
```

### **Search & Filter**

- **Real-time Search**: Instant filtering as you type
- **Multi-field Search**: Searches across asset, symbol, name, and source
- **Results Count**: Shows filtered vs. total results
- **No Results State**: Graceful handling when no matches found

## 🧪 Testing

### **Component Testing**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import AssetCardGrid from './AssetCardGrid';

test('renders asset cards correctly', () => {
  const mockAssets = [
    {
      asset: 'Test Asset',
      price: 100,
      change24h: 5,
      volume24h: 1000000,
      marketCap: 1000000000,
      source: 'Test Source'
    }
  ];

  render(<AssetCardGrid assets={mockAssets} />);
  
  expect(screen.getByText('Test Asset')).toBeInTheDocument();
  expect(screen.getByText('$100.00')).toBeInTheDocument();
});

test('handles card clicks', () => {
  const mockOnClick = jest.fn();
  const mockAssets = [/* ... */];

  render(<AssetCardGrid assets={mockAssets} onCardClick={mockOnClick} />);
  
  const card = screen.getByText('Test Asset').closest('div');
  fireEvent.click(card!);
  
  expect(mockOnClick).toHaveBeenCalledWith(mockAssets[0]);
});
```

## 🚀 Performance

### **Optimizations**

- **Memoized Filtering**: Search results cached and optimized
- **Lazy Rendering**: Cards render with staggered animations
- **Efficient Updates**: Minimal re-renders on data changes
- **CSS Transitions**: Hardware-accelerated animations

### **Best Practices**

- **Virtual Scrolling**: For large datasets (>100 assets), consider virtual scrolling
- **Debounced Search**: Implement debouncing for search input if needed
- **Image Optimization**: Use optimized images for asset icons
- **Bundle Splitting**: Consider code-splitting for large component libraries

## 🔧 Customization

### **Custom Card Layout**

```typescript
// Override individual card rendering
const CustomAssetCard = ({ asset, ...props }) => (
  <div className="custom-card-layout">
    {/* Custom card content */}
  </div>
);

// Use in grid
<AssetCardGrid
  assets={assets}
  renderCard={CustomAssetCard}
/>
```

### **Custom Styling**

```css
/* Custom CSS for specific themes */
.custom-theme .asset-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #4c51bf;
}

.custom-theme .asset-card:hover {
  transform: translateY(-8px) scale(1.05);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

## 📚 Examples

### **Demo Component**

See `AssetCardGridDemo.tsx` for a complete working example with:
- Tab navigation between asset types
- Sample data for all categories
- Feature showcase
- Usage instructions

### **Integration Examples**

- **Portfolio Page**: Display user's asset holdings
- **Market Overview**: Show trending assets
- **Watchlist**: User's saved assets
- **Search Results**: Filtered asset listings

## 🆘 Troubleshooting

### **Common Issues**

1. **Cards Not Rendering**: Check that `assets` array is not empty
2. **Hover Effects Not Working**: Ensure CSS transitions are enabled
3. **Search Not Filtering**: Verify `assets` prop updates correctly
4. **Responsive Issues**: Check Tailwind CSS configuration

### **Debug Mode**

```typescript
// Enable debug logging
const debugMode = process.env.NODE_ENV === 'development';

<AssetCardGrid
  assets={assets}
  onCardClick={(asset) => {
    if (debugMode) {
      console.log('Asset clicked:', asset);
    }
    // Handle click
  }}
/>
```

## 📄 License

This component is part of the Avila Protocol project and follows the same licensing terms.

## 🤝 Contributing

To improve this component:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for the Avila Protocol team** 