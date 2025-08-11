# MultiStockMock Setup Script

This script (`mockStocksSetup.ts`) provides a comprehensive TypeScript backend solution for setting up and managing mock stocks on the Avila Protocol's MultiStockMock module deployed on Aptos testnet.

## 🎯 Purpose

The script automates the complete setup process for testing the Avila Protocol options trading system by:

1. **Initializing** the MultiStockMock module
2. **Registering** multiple mock stocks (AAPL, GOOGL, TSLA, MSFT, AMZN)
3. **Minting** mock tokens to test accounts
4. **Setting** initial oracle prices for all stocks
5. **Verifying** the complete setup

## 📋 Prerequisites

Before running this script, ensure you have:

- ✅ **Aptos CLI** installed and configured
- ✅ **Node.js** (v16 or higher) and npm
- ✅ **Testnet account** with sufficient APT for gas fees
- ✅ **MultiStockMock module** deployed to Aptos testnet
- ✅ **Admin private key** for the deployed module

## 🔧 Installation

1. **Install dependencies:**
   ```bash
   cd backend/typescript
   npm install
   ```

2. **Build the TypeScript:**
   ```bash
   npm run build
   ```

## ⚙️ Configuration

Before running the script, you **MUST** update the configuration in `mockStocksSetup.ts`:

### Required Configuration Updates

```typescript
const CONFIG = {
  // Replace with your actual testnet account details
  ADMIN_PRIVATE_KEY: "YOUR_ACTUAL_PRIVATE_KEY_HERE",
  ADMIN_ADDRESS: "YOUR_ACTUAL_ADDRESS_HERE",
  
  // Replace with your deployed module address
  MODULE_ADDRESS: "YOUR_DEPLOYED_MODULE_ADDRESS_HERE",
  
  // Customize mock stocks as needed
  MOCK_STOCKS: [
    {
      ticker: "AAPL",
      name: "Apple Inc.",
      decimals: 8,
      initialPrice: 150.50,
      initialSupply: 1000000
    },
    // ... add more stocks
  ],
  
  // Update with actual test account addresses
  TEST_ACCOUNTS: [
    "0xACTUAL_TEST_ACCOUNT_1",
    "0xACTUAL_TEST_ACCOUNT_2",
    // ... add more test accounts
  ]
};
```

### Configuration Details

- **`ADMIN_PRIVATE_KEY`**: Your testnet account's private key (hex format)
- **`ADMIN_ADDRESS`**: Your testnet account's address
- **`MODULE_ADDRESS`**: Address where MultiStockMock module is deployed
- **`MOCK_STOCKS`**: Array of stock configurations with ticker, name, decimals, price, and supply
- **`TEST_ACCOUNTS`**: Array of test account addresses to receive minted tokens

## 🚀 Usage

### Run Complete Setup

```bash
# From backend/typescript directory
npm run build
node dist/mockStocksSetup.js
```

### Run Individual Functions

The script exports individual functions for selective execution:

```typescript
import { 
  initializeMultiStockMock,
  registerStock,
  mintTokens,
  setStockPrice 
} from './mockStocksSetup';

// Initialize module only
await initializeMultiStockMock();

// Register a single stock
await registerStock("AAPL", "Apple Inc.", 8);

// Mint tokens to specific account
await mintTokens("AAPL", "0xACCOUNT_ADDRESS", 1000000);

// Set price for a stock
await setStockPrice("AAPL", 150.50);
```

## 📊 What the Script Does

### 1. **Module Initialization**
- Connects to Aptos testnet
- Initializes the MultiStockMock module
- Verifies admin account and balance

### 2. **Stock Registration**
- Registers 5 mock stocks: AAPL, GOOGL, TSLA, MSFT, AMZN
- Sets appropriate decimals (8) for each stock
- Configures stock names and metadata

### 3. **Token Minting**
- Mints initial supply of each stock to test accounts
- Distributes tokens across multiple test addresses
- Ensures sufficient liquidity for testing

### 4. **Price Setting**
- Sets realistic initial prices for all stocks
- Converts prices to smallest units (8 decimal places)
- Establishes baseline for options pricing

### 5. **Verification**
- Checks module accessibility
- Verifies deployment status
- Confirms setup completion

## 🔍 Monitoring & Debugging

### Transaction Tracking

The script provides detailed logging for each operation:
- ✅ Success confirmations with transaction hashes
- ❌ Error details with specific failure reasons
- 📊 Progress indicators for multi-step operations

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Insufficient APT** | Ensure admin account has >0.1 APT for gas fees |
| **Module not found** | Verify MODULE_ADDRESS is correct and module is deployed |
| **Permission denied** | Check ADMIN_PRIVATE_KEY and ADMIN_ADDRESS match |
| **Network errors** | Verify NODE_URL points to valid testnet endpoint |

## 🧪 Testing the Setup

After running the script, you can verify the setup:

1. **Check Aptos Explorer** for transaction confirmations
2. **Verify module state** using Aptos CLI
3. **Test token transfers** between accounts
4. **Validate price updates** through oracle calls

## 🔒 Security Considerations

- **Never commit private keys** to version control
- **Use testnet accounts only** for development
- **Rotate test accounts** regularly
- **Monitor gas usage** and transaction costs

## 📈 Customization Options

### Add More Stocks

```typescript
MOCK_STOCKS: [
  // ... existing stocks
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    decimals: 8,
    initialPrice: 450.00,
    initialSupply: 300000
  }
]
```

### Modify Token Distribution

```typescript
TEST_ACCOUNTS: [
  "0xYOUR_MAIN_TEST_ACCOUNT",
  "0xLIQUIDITY_PROVIDER_ACCOUNT",
  "0xTRADER_ACCOUNT_1",
  "0xTRADER_ACCOUNT_2"
]
```

### Adjust Price Precision

```typescript
// For 6 decimal precision instead of 8
decimals: 6,
initialPrice: 150.50, // Will be stored as 150500000
```

## 🚨 Error Handling

The script includes comprehensive error handling:

- **Network failures**: Automatic retry with exponential backoff
- **Transaction failures**: Detailed error messages and rollback guidance
- **Validation errors**: Pre-execution parameter validation
- **Gas estimation**: Automatic gas limit calculation

## 📞 Support

For issues or questions:

1. Check the **error logs** for specific failure details
2. Verify **configuration values** match your deployment
3. Ensure **Aptos testnet** is accessible
4. Review **transaction history** on Aptos Explorer

## 🔄 Future Enhancements

Potential improvements for the script:

- **Batch transactions** for better gas efficiency
- **Dynamic price updates** from external APIs
- **Automated testing** integration
- **Configuration file** support (JSON/YAML)
- **Web dashboard** for monitoring

---

**Note**: This script is designed for development and testing purposes. Always test thoroughly on testnet before considering mainnet deployment. 