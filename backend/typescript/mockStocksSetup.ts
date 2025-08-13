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
 */

import { AptosClient, AptosAccount } from "aptos";

// Configuration - Customize these values for your deployment
const CONFIG = {
  // Aptos testnet configuration
  NODE_URL: "https://fullnode.testnet.aptoslabs.com",
  
  // Your testnet account configuration
  ADMIN_PRIVATE_KEY: "YOUR_ADMIN_PRIVATE_KEY_HERE", // Replace with actual private key
  ADMIN_ADDRESS: "YOUR_ADMIN_ADDRESS_HERE", // Replace with actual address
  
  // MultiStockMock module configuration
  MODULE_ADDRESS: "YOUR_MODULE_ADDRESS_HERE", // Replace with deployed module address
  MODULE_NAME: "multi_stock_mock",
  
  // Mock stocks configuration
  MOCK_STOCKS: [
    {
      ticker: "AAPL",
      name: "Apple Inc.",
      decimals: 8,
      initialPrice: 150.50,
      initialSupply: 1000000
    },
    {
      ticker: "GOOGL", 
      name: "Alphabet Inc.",
      decimals: 8,
      initialPrice: 2750.00,
      initialSupply: 500000
    },
    {
      ticker: "TSLA",
      name: "Tesla Inc.",
      decimals: 8,
      initialPrice: 850.25,
      initialSupply: 750000
    },
    {
      ticker: "MSFT",
      name: "Microsoft Corporation",
      decimals: 8,
      initialPrice: 320.75,
      initialSupply: 800000
    },
    {
      ticker: "AMZN",
      name: "Amazon.com Inc.",
      decimals: 8,
      initialPrice: 135.50,
      initialSupply: 600000
    }
  ],
  
  // Test accounts to mint tokens to
  TEST_ACCOUNTS: [
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234"
  ]
};

// Initialize Aptos client and admin account
let aptosClient: AptosClient;
let adminAccount: AptosAccount;

/**
 * Initialize the Aptos client and admin account
 */
async function initializeAptosConnection(): Promise<void> {
  try {
    console.log("🔌 Initializing Aptos connection...");
    
    // Create Aptos client for testnet
    aptosClient = new AptosClient(CONFIG.NODE_URL);
    
    // Create admin account from private key
    adminAccount = new AptosAccount(
      Buffer.from(CONFIG.ADMIN_PRIVATE_KEY, 'hex')
    );
    
    // Verify connection by checking account info
    const accountInfo = await aptosClient.getAccount(adminAccount.address());
    console.log(`✅ Connected to Aptos testnet`);
    console.log(`   Admin address: ${adminAccount.address().toString()}`);
    console.log(`   Account sequence number: ${accountInfo.sequence_number}`);
    
    // Check account balance
    const balance = await aptosClient.getAccountResource(
      adminAccount.address(),
      "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
    );
    const aptBalance = (balance.data as any).coin.value;
    console.log(`   APT balance: ${aptBalance / 100000000} APT`);
    
  } catch (error) {
    console.error("❌ Failed to initialize Aptos connection:", error);
    throw error;
  }
}

/**
 * Initialize the MultiStockMock module
 * Calls the init() function to set up the module
 */
async function initializeMultiStockMock(): Promise<void> {
  try {
    console.log("\n🚀 Initializing MultiStockMock module...");
    
    // Create transaction payload for init() function
    const payload = {
      function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::init`,
      type_arguments: [],
      arguments: []
    };
    
    // Submit transaction
    const transaction = await aptosClient.generateTransaction(
      adminAccount.address(),
      payload,
      { max_gas_amount: "10000" }
    );
    
    // Sign and submit transaction
    const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
    const result = await aptosClient.submitTransaction(signedTxn);
    
    // Wait for transaction confirmation
    await aptosClient.waitForTransaction(result.hash);
    
    console.log(`✅ MultiStockMock module initialized successfully`);
    console.log(`   Transaction hash: ${result.hash}`);
    
  } catch (error) {
    console.error("❌ Failed to initialize MultiStockMock module:", error);
    throw error;
  }
}

/**
 * Register a mock stock in the MultiStockMock module
 * Calls the register_stock() function
 */
async function registerStock(
  ticker: string, 
  name: string, 
  decimals: number
): Promise<void> {
  try {
    console.log(`📈 Registering stock: ${ticker} (${name})`);
    
    // Create transaction payload for register_stock() function
    const payload = {
      function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::register_stock`,
      type_arguments: [],
      arguments: [ticker, name, decimals]
    };
    
    // Submit transaction
    const transaction = await aptosClient.generateTransaction(
      adminAccount.address(),
      payload,
      { max_gas_amount: "10000" }
    );
    
    // Sign and submit transaction
    const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
    const result = await aptosClient.submitTransaction(signedTxn);
    
    // Wait for transaction confirmation
    await aptosClient.waitForTransaction(result.hash);
    
    console.log(`✅ Stock ${ticker} registered successfully`);
    console.log(`   Transaction hash: ${result.hash}`);
    
  } catch (error) {
    console.error(`❌ Failed to register stock ${ticker}:`, error);
    throw error;
  }
}

/**
 * Register all configured mock stocks
 */
async function registerAllStocks(): Promise<void> {
  try {
    console.log("\n📊 Registering all mock stocks...");
    
    for (const stock of CONFIG.MOCK_STOCKS) {
      await registerStock(stock.ticker, stock.name, stock.decimals);
      // Add delay between transactions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("✅ All mock stocks registered successfully");
    
  } catch (error) {
    console.error("❌ Failed to register all stocks:", error);
    throw error;
  }
}

/**
 * Mint mock tokens to a specific account
 * Calls the mint() function
 */
async function mintTokens(
  ticker: string,
  recipientAddress: string,
  amount: number
): Promise<void> {
  try {
    console.log(`🪙 Minting ${amount} ${ticker} tokens to ${recipientAddress}`);
    
    // Create transaction payload for mint() function
    const payload = {
      function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::mint`,
      type_arguments: [],
      arguments: [ticker, recipientAddress, amount]
    };
    
    // Submit transaction
    const transaction = await aptosClient.generateTransaction(
      adminAccount.address(),
      payload,
      { max_gas_amount: "10000" }
    );
    
    // Sign and submit transaction
    const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
    const result = await aptosClient.submitTransaction(signedTxn);
    
    // Wait for transaction confirmation
    await aptosClient.waitForTransaction(result.hash);
    
    console.log(`✅ Minted ${amount} ${ticker} tokens successfully`);
    console.log(`   Transaction hash: ${result.hash}`);
    
  } catch (error) {
    console.error(`❌ Failed to mint ${ticker} tokens:`, error);
    throw error;
  }
}

/**
 * Mint tokens to all test accounts for all stocks
 */
async function mintTokensToAllAccounts(): Promise<void> {
  try {
    console.log("\n🪙 Minting tokens to all test accounts...");
    
    for (const stock of CONFIG.MOCK_STOCKS) {
      for (const testAccount of CONFIG.TEST_ACCOUNTS) {
        await mintTokens(stock.ticker, testAccount, stock.initialSupply);
        // Add delay between transactions
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log("✅ Tokens minted to all test accounts successfully");
    
  } catch (error) {
    console.error("❌ Failed to mint tokens to all accounts:", error);
    throw error;
  }
}

/**
 * Set mock oracle price for a stock
 * Calls the set_price() function
 */
async function setStockPrice(ticker: string, price: number): Promise<void> {
  try {
    console.log(`💰 Setting price for ${ticker}: $${price}`);
    
    // Create transaction payload for set_price() function
    const payload = {
      function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::set_price`,
      type_arguments: [],
      arguments: [ticker, Math.floor(price * 100000000)] // Convert to smallest unit
    };
    
    // Submit transaction
    const transaction = await aptosClient.generateTransaction(
      adminAccount.address(),
      payload,
      { max_gas_amount: "10000" }
    );
    
    // Sign and submit transaction
    const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
    const result = await aptosClient.submitTransaction(signedTxn);
    
    // Wait for transaction confirmation
    await aptosClient.waitForTransaction(result.hash);
    
    console.log(`✅ Price set for ${ticker} successfully: $${price}`);
    console.log(`   Transaction hash: ${result.hash}`);
    
  } catch (error) {
    console.error(`❌ Failed to set price for ${ticker}:`, error);
    throw error;
  }
}

/**
 * Set initial prices for all stocks
 */
async function setAllStockPrices(): Promise<void> {
  try {
    console.log("\n💰 Setting initial prices for all stocks...");
    
    for (const stock of CONFIG.MOCK_STOCKS) {
      await setStockPrice(stock.ticker, stock.initialPrice);
      // Add delay between transactions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("✅ All stock prices set successfully");
    
  } catch (error) {
    console.error("❌ Failed to set all stock prices:", error);
    throw error;
  }
}

/**
 * Verify the setup by checking module state
 */
async function verifySetup(): Promise<void> {
  try {
    console.log("\n🔍 Verifying setup...");
    
    // Check if module exists
    await aptosClient.getAccountResource(
      CONFIG.MODULE_ADDRESS,
      `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::MultiStockMock`
    );
    
    console.log("✅ MultiStockMock module is deployed and accessible");
    
    // You can add more verification logic here
    // For example, checking registered stocks, token supplies, etc.
    
  } catch (error) {
    console.error("❌ Setup verification failed:", error);
    throw error;
  }
}

/**
 * Main function to run the complete setup
 */
async function main(): Promise<void> {
  try {
    console.log("🚀 Starting MultiStockMock setup for Avila Protocol...\n");
    
    // Step 1: Initialize Aptos connection
    await initializeAptosConnection();
    
    // Step 2: Initialize MultiStockMock module
    await initializeMultiStockMock();
    
    // Step 3: Register all mock stocks
    await registerAllStocks();
    
    // Step 4: Mint tokens to test accounts
    await mintTokensToAllAccounts();
    
    // Step 5: Set initial stock prices
    await setAllStockPrices();
    
    // Step 6: Verify setup
    await verifySetup();
    
    console.log("\n🎉 MultiStockMock setup completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   - ${CONFIG.MOCK_STOCKS.length} stocks registered`);
    console.log(`   - Tokens minted to ${CONFIG.TEST_ACCOUNTS.length} test accounts`);
    console.log(`   - Initial prices set for all stocks`);
    console.log("\n🔧 The mock stocks are now ready for testing the Avila Protocol!");
    
  } catch (error) {
    console.error("\n💥 Setup failed:", error);
    process.exit(1);
  }
}

// Export functions for potential reuse
export {
  initializeAptosConnection,
  initializeMultiStockMock,
  registerStock,
  registerAllStocks,
  mintTokens,
  mintTokensToAllAccounts,
  setStockPrice,
  setAllStockPrices,
  verifySetup
};

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
} 