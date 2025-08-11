# Avila Protocol Frontend

A modern React + TypeScript frontend for the Avila Protocol, a decentralized options trading platform built on Aptos blockchain.

## 🚀 Features

- **Modern UI/UX**: Built with React 18, TypeScript, and Tailwind CSS
- **Blockchain Integration**: Full integration with Aptos testnet using the official SDK
- **Wallet Support**: Petra and Pontem wallet integration
- **Responsive Design**: Mobile-first responsive design
- **State Management**: Zustand for efficient state management
- **Real-time Updates**: Live market data and portfolio updates
- **Testnet Ready**: Complete testnet environment with mock data

## 📱 Pages & Components

### Core Pages
- **Home**: Protocol overview and quick start guide
- **Markets**: View all available tokenized stocks and prices
- **Trade**: Options trading interface (call/put orders)
- **Portfolio**: User positions, PnL, and margin management
- **Governance**: Protocol governance and proposal voting
- **Admin**: Administrative functions (KYC, asset registration, system settings)

### Key Components
- **Navbar**: Navigation and wallet connection
- **TestnetBanner**: Testnet environment warnings
- **NotificationContainer**: Toast notifications system
- **Responsive Tables**: Data display with mobile optimization

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand with persistence
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Blockchain**: Aptos TypeScript SDK
- **Wallet Integration**: Petra & Pontem wallet support

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Aptos wallet (Petra or Pontem) for testnet

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd avila-protocol-testnet/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # Aptos Testnet Configuration
   VITE_APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com
   VITE_APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com
   
   # Contract Addresses (Replace with actual deployed addresses)
   VITE_AVILA_PROTOCOL_ADDRESS=0xYOUR_AVILA_PROTOCOL_ADDRESS
   VITE_OPTIONS_CORE_ADDRESS=0xYOUR_OPTIONS_CORE_ADDRESS
   VITE_ORDER_BOOK_ADDRESS=0xYOUR_ORDER_BOOK_ADDRESS
   VITE_MARGIN_ENGINE_ADDRESS=0xYOUR_MARGIN_ENGINE_ADDRESS
   VITE_SETTLEMENT_ENGINE_ADDRESS=0xYOUR_SETTLEMENT_ENGINE_ADDRESS
   VITE_COLLATERAL_VAULT_ADDRESS=0xYOUR_COLLATERAL_VAULT_ADDRESS
   VITE_TOKENIZED_ASSET_REGISTRY_ADDRESS=0xYOUR_TOKENIZED_ASSET_REGISTRY_ADDRESS
   VITE_COMPLIANCE_GATE_ADDRESS=0xYOUR_COMPLIANCE_GATE_ADDRESS
   VITE_GOVERNANCE_ADMIN_ADDRESS=0xYOUR_GOVERNANCE_ADMIN_ADDRESS
   VITE_MULTI_STOCK_MOCK_ADDRESS=0xYOUR_MULTI_STOCK_MOCK_ADDRESS
   VITE_PRICE_ORACLE_ADAPTER_ADDRESS=0xYOUR_PRICE_ORACLE_ADAPTER_ADDRESS
   VITE_EVENTS_AND_AUDITING_ADDRESS=0xYOUR_EVENTS_AND_AUDITING_ADDRESS
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:5173`

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.tsx      # Navigation and wallet connection
│   ├── TestnetBanner.tsx # Testnet environment warnings
│   └── NotificationContainer.tsx # Toast notifications
├── pages/              # Page components
│   ├── Home.tsx        # Landing page
│   ├── Markets.tsx     # Market overview
│   ├── Trade.tsx       # Trading interface
│   ├── Portfolio.tsx   # User portfolio
│   ├── Governance.tsx  # Governance interface
│   └── Admin.tsx       # Admin panel
├── services/           # Business logic and API calls
│   ├── aptos.ts        # Aptos blockchain service
│   ├── contracts.ts    # Smart contract interactions
│   └── wallet.ts       # Wallet management
├── stores/             # State management
│   └── appStore.ts     # Main application state
├── config/             # Configuration files
│   └── environment.ts  # Environment variables
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles and Tailwind
```

### Key Services

#### AptosService
- Blockchain connection management
- Account information and balance queries
- Transaction submission (placeholder)

#### ContractService
- Smart contract interaction methods
- All Move contract function calls
- Transaction payload creation

#### WalletService
- Wallet connection (Petra/Pontem)
- Transaction signing and submission
- Account management

### State Management

The application uses Zustand for state management with the following key stores:

- **User State**: Wallet connection, user info, admin status
- **Market Data**: Assets, prices, market information
- **Trading State**: Positions, orders, portfolio data
- **UI State**: Notifications, loading states, errors

## 🧪 Testnet Features

### Mock Data
- **Mock Assets**: AAPL, GOOGL, TSLA, MSFT, AMZN
- **Simulated Prices**: Random price variations for testing
- **Mock Trading**: All orders and transactions are simulated

### Testnet Warnings
- Prominent testnet banners on all pages
- Clear indication that no real money is involved
- Links to Aptos testnet faucet

## 🔐 Wallet Integration

### Supported Wallets
- **Petra**: Primary Aptos wallet
- **Pontem**: Alternative Aptos wallet

### Connection Flow
1. User clicks "Connect Wallet"
2. System detects available wallets
3. Wallet connection request
4. Account information retrieval
5. State update and UI refresh

## 🎨 Design System

### Color Palette
- **Primary**: Blue shades for main actions
- **Secondary**: Gray shades for neutral elements
- **Success**: Green for positive actions
- **Warning**: Yellow for caution
- **Error**: Red for errors and destructive actions

### Component Classes
- `.btn-primary` - Primary action buttons
- `.btn-secondary` - Secondary action buttons
- `.btn-danger` - Destructive action buttons
- `.card` - Content containers
- `.input-field` - Form inputs

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on push to main branch

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APTOS_NODE_URL` | Aptos node URL | `https://fullnode.testnet.aptoslabs.com` |
| `VITE_APTOS_FAUCET_URL` | Aptos faucet URL | `https://faucet.testnet.aptoslabs.com` |
| `VITE_APP_NAME` | Application name | `Avila Protocol` |
| `VITE_APP_ENVIRONMENT` | Environment | `testnet` |

### Contract Addresses
All contract addresses are configurable via environment variables. Update these with your actual deployed contract addresses.

## 🧪 Testing

### Manual Testing
1. **Wallet Connection**: Test Petra and Pontem wallet connections
2. **Navigation**: Verify all pages load correctly
3. **Responsive Design**: Test on mobile and desktop
4. **Mock Data**: Verify mock data displays correctly

### Automated Testing
```bash
# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Fails**
- Ensure wallet extension is installed
- Check if wallet is unlocked
- Verify network is set to testnet

**Build Errors**
- Clear `node_modules` and reinstall
- Check Node.js version (16+ required)
- Verify TypeScript configuration

**Styling Issues**
- Ensure Tailwind CSS is properly configured
- Check if CSS classes are being applied
- Verify PostCSS configuration

## 📚 Resources

- [Aptos Documentation](https://aptos.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the troubleshooting section

---

**Note**: This is a testnet implementation. All trading is simulated and no real money is involved.
