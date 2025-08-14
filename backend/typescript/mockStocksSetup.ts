/**
 * MultiStockMock Setup Script for Avila Protocol
 * 
 * This script demonstrates how to interact with the deployed MultiStockMock Move module
 * on Aptos testnet to set up mock stocks for testing the options trading protocol.
 * 
 * Features:
 * - Initialize MultiStockMock module
 * - Register multiple mock stocks
 * - Mint mock tokens to test accounts
 * - Set mock oracle prices
 * 
 * Prerequisites:
 * - Aptos CLI installed and configured
 * - Testnet account with sufficient APT for gas fees
 * - MultiStockMock module deployed to testnet
 * - Environment variables configured (see env.mockStocksSetup.example)
 */

import { AptosConfig, Network, Account, AccountAddress, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configuration
const config = {
  nodeUrl: process.env.NODE_URL || "https://fullnode.testnet.aptoslabs.com",
  adminPrivateKey: process.env.ADMIN_PRIVATE_KEY || "",
  adminAddress: process.env.ADMIN_ADDRESS || "",
  moduleAddress: process.env.MODULE_ADDRESS || "",
  moduleName: process.env.MODULE_NAME || "multi_stock_mock",
  testAccounts: process.env.TEST_ACCOUNTS ? process.env.TEST_ACCOUNTS.split(",") : []
};

// Initialize Aptos client
const aptosConfig = new AptosConfig({ 
  network: Network.TESTNET,
  fullnode: config.nodeUrl
});

// Mock stocks configuration
const mockStocks = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    decimals: 8,
    initialPrice: 150.00,
    description: "Apple Inc. Common Stock"
  },
  {
    symbol: "GOOGL", 
    name: "Alphabet Inc.",
    decimals: 8,
    initialPrice: 2800.00,
    description: "Alphabet Inc. Class A Common Stock"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation", 
    decimals: 8,
    initialPrice: 300.00,
    description: "Microsoft Corporation Common Stock"
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    decimals: 8, 
    initialPrice: 800.00,
    description: "Tesla Inc. Common Stock"
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    decimals: 8,
    initialPrice: 3500.00,
    description: "Amazon.com Inc. Common Stock"
  }
];

/**
 * Create account from private key hex string
 */
function createAccountFromPrivateKey(privateKeyHex: string): Account {
  try {
    // Remove 0x prefix if present
    const cleanHex = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
    
    // Convert hex to Uint8Array
    const privateKeyBytes = new Uint8Array(
      cleanHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    // Create Ed25519PrivateKey directly from Uint8Array
    const privateKey = new Ed25519PrivateKey(privateKeyBytes);
    
    // Create account
    return Account.fromPrivateKey({ privateKey });
  } catch (error) {
    throw new Error(`Failed to create account from private key: ${error}`);
  }
}

/**
 * Main setup function
 */
async function main() {
  try {
    console.log("🚀 Starting MultiStockMock setup...");
    
    // Validate configuration
    if (!config.adminPrivateKey || !config.adminAddress || !config.moduleAddress) {
      throw new Error("Missing required configuration. Please check your environment variables.");
    }

    console.log(`📍 Module Address: ${config.moduleAddress}`);
    console.log(`👤 Admin Address: ${config.adminAddress}`);
    console.log(`🌐 Network: ${aptosConfig.network}`);

    // Create admin account
    const adminAccount = createAccountFromPrivateKey(config.adminPrivateKey);
    console.log(`✅ Admin account created: ${adminAccount.accountAddress}`);

    // Check admin account balance
    await checkAccountBalance(adminAccount.accountAddress);

    // Initialize MultiStockMock module
    await initializeMultiStockMock(adminAccount);

    // Register mock stocks
    await registerMockStocks(adminAccount);

    // Mint tokens to test accounts
    if (config.testAccounts.length > 0) {
      await mintTokensToTestAccounts(adminAccount);
    }

    // Set initial oracle prices
    await setInitialOraclePrices(adminAccount);

    console.log("🎉 MultiStockMock setup completed successfully!");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

/**
 * Check account balance
 */
async function checkAccountBalance(accountAddress: AccountAddress): Promise<void> {
  try {
    const { getAptosFullNode } = await import("@aptos-labs/ts-sdk");
    
    const response = await getAptosFullNode({
      aptosConfig,
      originMethod: "checkAccountBalance",
      path: `accounts/${accountAddress}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`,
      params: {}
    });

    if (response.data && typeof response.data === 'object' && 'coin' in response.data) {
      const balance = (response.data as any).coin.value;
      console.log(`💰 Account balance: ${balance} APT`);
      
      if (BigInt(balance) < BigInt(1000000)) { // Less than 0.001 APT
        console.warn("⚠️  Low balance detected. Consider funding the account.");
      }
    }
  } catch (error) {
    console.warn("⚠️  Could not check account balance:", error);
  }
}

/**
 * Initialize MultiStockMock module
 */
async function initializeMultiStockMock(adminAccount: Account): Promise<void> {
  try {
    console.log("🔧 Initializing MultiStockMock module...");
    
    const { postAptosFullNode } = await import("@aptos-labs/ts-sdk");
    
    const payload = {
      function: `${config.moduleAddress}::${config.moduleName}::initialize`,
      type_arguments: [],
      arguments: []
    };

    const response = await postAptosFullNode({
      aptosConfig,
      originMethod: "initializeMultiStockMock",
      path: "transactions",
      body: payload
    });

    console.log("✅ MultiStockMock module initialized");
    if (response.data && typeof response.data === 'object' && 'hash' in response.data) {
      console.log(`📝 Transaction hash: ${(response.data as any).hash}`);
    }
    
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      console.log("ℹ️  MultiStockMock module already initialized");
    } else {
      throw error;
    }
  }
}

/**
 * Register mock stocks
 */
async function registerMockStocks(adminAccount: Account): Promise<void> {
  console.log("📊 Registering mock stocks...");
  
  const { postAptosFullNode } = await import("@aptos-labs/ts-sdk");
  
  for (const stock of mockStocks) {
    try {
      console.log(`  📈 Registering ${stock.symbol}...`);
      
      const payload = {
        function: `${config.moduleAddress}::${config.moduleName}::register_stock`,
        type_arguments: [],
        arguments: [
          stock.symbol,
          stock.name,
          stock.decimals,
          Math.floor(stock.initialPrice * 100000000), // Convert to smallest unit
          stock.description
        ]
      };

      const response = await postAptosFullNode({
        aptosConfig,
        originMethod: "registerMockStock",
        path: "transactions",
        body: payload
      });

      console.log(`    ✅ ${stock.symbol} registered`);
      if (response.data && typeof response.data === 'object' && 'hash' in response.data) {
        console.log(`       Transaction: ${(response.data as any).hash}`);
      }
      
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log(`    ℹ️  ${stock.symbol} already registered`);
      } else {
        console.error(`    ❌ Failed to register ${stock.symbol}:`, error.message);
      }
    }
  }
}

/**
 * Mint tokens to test accounts
 */
async function mintTokensToTestAccounts(adminAccount: Account): Promise<void> {
  console.log("🪙 Minting tokens to test accounts...");
  
  const { postAptosFullNode } = await import("@aptos-labs/ts-sdk");
  
  for (const testAccount of config.testAccounts) {
    try {
      console.log(`  🎯 Minting to ${testAccount}...`);
      
      for (const stock of mockStocks) {
        const payload = {
          function: `${config.moduleAddress}::${config.moduleName}::mint_tokens`,
          type_arguments: [],
          arguments: [
            testAccount,
            stock.symbol,
            "1000000000" // 10 tokens (assuming 8 decimals)
          ]
        };

        const response = await postAptosFullNode({
          aptosConfig,
          originMethod: "mintTokensToTestAccount",
          path: "transactions",
          body: payload
        });

        console.log(`    ✅ Minted ${stock.symbol} to ${testAccount}`);
        if (response.data && typeof response.data === 'object' && 'hash' in response.data) {
          console.log(`       Transaction: ${(response.data as any).hash}`);
        }
      }
      
    } catch (error) {
      console.error(`    ❌ Failed to mint to ${testAccount}:`, error.message);
    }
  }
}

/**
 * Set initial oracle prices
 */
async function setInitialOraclePrices(adminAccount: Account): Promise<void> {
  console.log("📊 Setting initial oracle prices...");
  
  const { postAptosFullNode } = await import("@aptos-labs/ts-sdk");
  
  for (const stock of mockStocks) {
    try {
      console.log(`  💰 Setting price for ${stock.symbol}::set_oracle_price`);
      
      const payload = {
        function: `${config.moduleAddress}::${config.moduleName}::set_oracle_price`,
        type_arguments: [],
        arguments: [
          stock.symbol,
          Math.floor(stock.initialPrice * 100000000) // Convert to smallest unit
        ]
      };

      const response = await postAptosFullNode({
        aptosConfig,
        originMethod: "setInitialOraclePrice",
        path: "transactions",
        body: payload
      });

      console.log(`    ✅ ${stock.symbol} price set to $${stock.initialPrice}`);
      if (response.data && typeof response.data === 'object' && 'hash' in response.data) {
        console.log(`       Transaction: ${(response.data as any).hash}`);
      }
      
    } catch (error) {
      console.error(`    ❌ Failed to set price for ${stock.symbol}:`, error.message);
    }
  }
}

/**
 * Display setup summary
 */
function displaySummary(): void {
  console.log("\n📋 Setup Summary:");
  console.log("==================");
  console.log(`🌐 Network: ${aptosConfig.network}`);
  console.log(`📍 Module: ${config.moduleAddress}::${config.moduleName}`);
  console.log(`👤 Admin: ${config.adminAddress}`);
  console.log(`📊 Stocks: ${mockStocks.length} registered`);
  console.log(`👥 Test Accounts: ${config.testAccounts.length}`);
  
  console.log("\n📈 Registered Stocks:");
  mockStocks.forEach(stock => {
    console.log(`  • ${stock.symbol}: $${stock.initialPrice} (${stock.description})`);
  });
  
  if (config.testAccounts.length > 0) {
    console.log("\n👥 Test Accounts:");
    config.testAccounts.forEach(account => {
      console.log(`  • ${account}`);
    });
  }
  
  console.log("\n🎯 Next Steps:");
  console.log("  1. Verify transactions on Aptos Explorer");
  console.log("  2. Test token transfers between accounts");
  console.log("  3. Test oracle price updates");
  console.log("  4. Integrate with your options trading protocol");
}

// Run the setup
if (require.main === module) {
  main()
    .then(() => {
      displaySummary();
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    });
}

export { main, mockStocks, config }; 