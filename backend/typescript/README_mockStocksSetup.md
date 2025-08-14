# MultiStockMock Setup Script

## Overview

The `mockStocksSetup.ts` script is a comprehensive setup tool for the Avila Protocol's MultiStockMock module on Aptos testnet. This script automates the process of initializing mock stocks, registering them in the protocol, and setting up initial oracle prices for testing purposes.

## Features

- 🚀 **Automated Setup**: Complete initialization of the MultiStockMock module
- 📊 **Stock Registration**: Register multiple mock stocks with realistic data
- 🪙 **Token Minting**: Mint mock tokens to test accounts
- 💰 **Oracle Pricing**: Set initial mock oracle prices for all stocks
- 🔧 **Error Handling**: Robust error handling with graceful fallbacks
- 📋 **Progress Tracking**: Detailed logging and progress indicators

## Prerequisites

Before running this script, ensure you have:

1. **Aptos CLI** installed and configured
2. **Testnet Account** with sufficient APT for gas fees (recommended: >0.1 APT)
3. **MultiStockMock Module** deployed to testnet
4. **Environment Variables** configured (see Configuration section)

## Installation

1. Navigate to the backend/typescript directory:
   ```bash
   cd backend/typescript
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp env.mockStocksSetup.example .env
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Aptos testnet configuration
NODE_URL=https://fullnode.testnet.aptoslabs.com

# Your testnet account configuration
ADMIN_PRIVATE_KEY=your_private_key_here
ADMIN_ADDRESS=your_public_address_here

# MultiStockMock module configuration
MODULE_ADDRESS=your_deployed_module_address_here
MODULE_NAME=multi_stock_mock

# Test accounts to mint tokens to (comma-separated)
TEST_ACCOUNTS=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef,0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### Configuration Details

- **NODE_URL**: Aptos testnet fullnode URL
- **ADMIN_PRIVATE_KEY**: Your account's private key (64-character hex string)
- **ADMIN_ADDRESS**: Your account's public address
- **MODULE_ADDRESS**: Address where the MultiStockMock module is deployed
- **MODULE_NAME**: Name of the deployed module (default: "multi_stock_mock")
- **TEST_ACCOUNTS**: Comma-separated list of test account addresses

## Mock Stocks Configuration

The script comes pre-configured with 5 popular stocks:

| Symbol | Name | Initial Price | Description |
|--------|------|---------------|-------------|
| AAPL   | Apple Inc. | $150.00 | Apple Inc. Common Stock |
| GOOGL  | Alphabet Inc. | $2,800.00 | Alphabet Inc. Class A Common Stock |
| MSFT   | Microsoft Corporation | $300.00 | Microsoft Corporation Common Stock |
| TSLA   | Tesla Inc. | $800.00 | Tesla Inc. Common Stock |
| AMZN   | Amazon.com Inc. | $3,500.00 | Amazon.com Inc. Common Stock |

## Usage

### Running the Script

1. **Compile TypeScript** (optional, for type checking):
   ```bash
   npx tsc --noEmit mockStocksSetup.ts
   ```

2. **Run with Node.js** (requires ts-node):
   ```bash
   npx ts-node mockStocksSetup.ts
   ```

3. **Run with TypeScript** (if ts-node is installed globally):
   ```bash
   ts-node mockStocksSetup.ts
   ```

### Expected Output

```
🚀 Starting MultiStockMock setup...
📍 Module Address: 0x1234...
👤 Admin Address: 0x5678...
🌐 Network: testnet
✅ Admin account created: 0x5678...
💰 Account balance: 1000000 APT
🔧 Initializing MultiStockMock module...
✅ MultiStockMock module initialized
📊 Registering mock stocks...
  📈 Registering AAPL...
    ✅ AAPL registered
  📈 Registering GOOGL...
    ✅ GOOGL registered
  📈 Registering MSFT...
    ✅ MSFT registered
  📈 Registering TSLA...
    ✅ TSLA registered
  📈 Registering AMZN...
    ✅ AMZN registered
🪙 Minting tokens to test accounts...
  🎯 Minting to 0x1234...
    ✅ Minted AAPL to 0x1234...
    ✅ Minted GOOGL to 0x1234...
    ✅ Minted MSFT to 0x1234...
    ✅ Minted TSLA to 0x1234...
    ✅ Minted AMZN to 0x1234...
📊 Setting initial oracle prices...
  💰 Setting price for AAPL...
    ✅ AAPL price set to $150.00
  💰 Setting price for GOOGL...
    ✅ GOOGL price set to $2800.00
  💰 Setting price for MSFT...
    ✅ MSFT price set to $300.00
  💰 Setting price for TSLA...
    ✅ TSLA price set to $800.00
  💰 Setting price for AMZN...
    ✅ AMZN price set to $3500.00
🎉 MultiStockMock setup completed successfully!

📋 Setup Summary:
==================
🌐 Network: testnet
📍 Module: 0x1234...::multi_stock_mock
👤 Admin: 0x5678...
📊 Stocks: 5 registered
👥 Test Accounts: 1

📈 Registered Stocks:
  • AAPL: $150.00 (Apple Inc. Common Stock)
  • GOOGL: $2800.00 (Alphabet Inc. Class A Common Stock)
  • MSFT: $300.00 (Microsoft Corporation Common Stock)
  • TSLA: $800.00 (Tesla Inc. Common Stock)
  • AMZN: $3500.00 (Amazon.com Inc. Common Stock)

👥 Test Accounts:
  • 0x1234...

🎯 Next Steps:
  1. Verify transactions on Aptos Explorer
  2. Test token transfers between accounts
  3. Test oracle price updates
  4. Integrate with your options trading protocol
```

## Error Handling

The script includes comprehensive error handling:

- **Configuration Validation**: Checks for required environment variables
- **Network Connectivity**: Validates Aptos testnet connection
- **Account Balance**: Warns if account has insufficient APT
- **Duplicate Operations**: Gracefully handles already-initialized modules
- **Transaction Failures**: Continues execution even if individual operations fail

## Troubleshooting

### Common Issues

1. **"Missing required configuration"**
   - Ensure all environment variables are set in `.env` file
   - Check that private key and addresses are correct

2. **"Failed to create account from private key"**
   - Verify private key format (64-character hex string)
   - Ensure private key doesn't have extra spaces or characters

3. **"Low balance detected"**
   - Fund your testnet account with APT from the faucet
   - Recommended minimum: 0.1 APT

4. **"Module already initialized"**
   - This is normal if the script has been run before
   - The script will continue with remaining operations

5. **"Failed to register stock"**
   - Check if the stock symbol already exists
   - Verify module address and permissions

### Debug Mode

For detailed debugging, you can modify the script to add more verbose logging:

```typescript
// Add this at the top of the main function
console.log('Debug: Configuration:', config);
console.log('Debug: AptosConfig:', aptosConfig);
```

## Security Considerations

⚠️ **Important Security Notes**:

1. **Never commit private keys** to version control
2. **Use testnet accounts only** for development
3. **Keep private keys secure** and limit access
4. **Rotate testnet accounts** regularly
5. **Monitor account balances** and transaction history

## Integration

### Using in Other Scripts

```typescript
import { main, mockStocks, config } from './mockStocksSetup';

// Run the complete setup
await main();

// Access configuration
console.log('Module address:', config.moduleAddress);

// Access stock definitions
console.log('Available stocks:', mockStocks.map(s => s.symbol));
```

### Customizing Stock List

To add or modify stocks, edit the `mockStocks` array:

```typescript
const mockStocks = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    decimals: 8,
    initialPrice: 450.00,
    description: "NVIDIA Corporation Common Stock"
  },
  // ... add more stocks
];
```

## Dependencies

- **@aptos-labs/ts-sdk**: Aptos TypeScript SDK (v4.0.0+)
- **dotenv**: Environment variable management
- **TypeScript**: For type checking and compilation

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Verify your configuration matches the requirements
3. Check Aptos testnet status and connectivity
4. Review transaction logs on Aptos Explorer

## License

This script is part of the Avila Protocol project and follows the same licensing terms. 