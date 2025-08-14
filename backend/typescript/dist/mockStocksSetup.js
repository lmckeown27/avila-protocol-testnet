"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAptosConnection = initializeAptosConnection;
exports.initializeMultiStockMock = initializeMultiStockMock;
exports.registerStock = registerStock;
exports.registerAllStocks = registerAllStocks;
exports.mintTokens = mintTokens;
exports.mintTokensToAllAccounts = mintTokensToAllAccounts;
exports.setStockPrice = setStockPrice;
exports.setAllStockPrices = setAllStockPrices;
exports.verifySetup = verifySetup;
const aptos_1 = require("aptos");
const CONFIG = {
    NODE_URL: "https://fullnode.testnet.aptoslabs.com",
    ADMIN_PRIVATE_KEY: "YOUR_ADMIN_PRIVATE_KEY_HERE",
    ADMIN_ADDRESS: "YOUR_ADMIN_ADDRESS_HERE",
    MODULE_ADDRESS: "YOUR_MODULE_ADDRESS_HERE",
    MODULE_NAME: "multi_stock_mock",
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
    TEST_ACCOUNTS: [
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234"
    ]
};
let aptosClient;
let adminAccount;
async function initializeAptosConnection() {
    try {
        console.log("🔌 Initializing Aptos connection...");
        aptosClient = new aptos_1.AptosClient(CONFIG.NODE_URL);
        adminAccount = new aptos_1.AptosAccount(Buffer.from(CONFIG.ADMIN_PRIVATE_KEY, 'hex'));
        const accountInfo = await aptosClient.getAccount(adminAccount.address());
        console.log(`✅ Connected to Aptos testnet`);
        console.log(`   Admin address: ${adminAccount.address().toString()}`);
        console.log(`   Account sequence number: ${accountInfo.sequence_number}`);
        const balance = await aptosClient.getAccountResource(adminAccount.address(), "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
        const aptBalance = balance.data.coin.value;
        console.log(`   APT balance: ${aptBalance / 100000000} APT`);
    }
    catch (error) {
        console.error("❌ Failed to initialize Aptos connection:", error);
        throw error;
    }
}
async function initializeMultiStockMock() {
    try {
        console.log("\n🚀 Initializing MultiStockMock module...");
        const payload = {
            function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::init`,
            type_arguments: [],
            arguments: []
        };
        const transaction = await aptosClient.generateTransaction(adminAccount.address(), payload, { max_gas_amount: "10000" });
        const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
        const result = await aptosClient.submitTransaction(signedTxn);
        await aptosClient.waitForTransaction(result.hash);
        console.log(`✅ MultiStockMock module initialized successfully`);
        console.log(`   Transaction hash: ${result.hash}`);
    }
    catch (error) {
        console.error("❌ Failed to initialize MultiStockMock module:", error);
        throw error;
    }
}
async function registerStock(ticker, name, decimals) {
    try {
        console.log(`📈 Registering stock: ${ticker} (${name})`);
        const payload = {
            function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::register_stock`,
            type_arguments: [],
            arguments: [ticker, name, decimals]
        };
        const transaction = await aptosClient.generateTransaction(adminAccount.address(), payload, { max_gas_amount: "10000" });
        const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
        const result = await aptosClient.submitTransaction(signedTxn);
        await aptosClient.waitForTransaction(result.hash);
        console.log(`✅ Stock ${ticker} registered successfully`);
        console.log(`   Transaction hash: ${result.hash}`);
    }
    catch (error) {
        console.error(`❌ Failed to register stock ${ticker}:`, error);
        throw error;
    }
}
async function registerAllStocks() {
    try {
        console.log("\n📊 Registering all mock stocks...");
        for (const stock of CONFIG.MOCK_STOCKS) {
            await registerStock(stock.ticker, stock.name, stock.decimals);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log("✅ All mock stocks registered successfully");
    }
    catch (error) {
        console.error("❌ Failed to register all stocks:", error);
        throw error;
    }
}
async function mintTokens(ticker, recipientAddress, amount) {
    try {
        console.log(`🪙 Minting ${amount} ${ticker} tokens to ${recipientAddress}`);
        const payload = {
            function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::mint`,
            type_arguments: [],
            arguments: [ticker, recipientAddress, amount]
        };
        const transaction = await aptosClient.generateTransaction(adminAccount.address(), payload, { max_gas_amount: "10000" });
        const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
        const result = await aptosClient.submitTransaction(signedTxn);
        await aptosClient.waitForTransaction(result.hash);
        console.log(`✅ Minted ${amount} ${ticker} tokens successfully`);
        console.log(`   Transaction hash: ${result.hash}`);
    }
    catch (error) {
        console.error(`❌ Failed to mint ${ticker} tokens:`, error);
        throw error;
    }
}
async function mintTokensToAllAccounts() {
    try {
        console.log("\n🪙 Minting tokens to all test accounts...");
        for (const stock of CONFIG.MOCK_STOCKS) {
            for (const testAccount of CONFIG.TEST_ACCOUNTS) {
                await mintTokens(stock.ticker, testAccount, stock.initialSupply);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        console.log("✅ Tokens minted to all test accounts successfully");
    }
    catch (error) {
        console.error("❌ Failed to mint tokens to all accounts:", error);
        throw error;
    }
}
async function setStockPrice(ticker, price) {
    try {
        console.log(`💰 Setting price for ${ticker}: $${price}`);
        const payload = {
            function: `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::set_price`,
            type_arguments: [],
            arguments: [ticker, Math.floor(price * 100000000)]
        };
        const transaction = await aptosClient.generateTransaction(adminAccount.address(), payload, { max_gas_amount: "10000" });
        const signedTxn = await aptosClient.signTransaction(adminAccount, transaction);
        const result = await aptosClient.submitTransaction(signedTxn);
        await aptosClient.waitForTransaction(result.hash);
        console.log(`✅ Price set for ${ticker} successfully: $${price}`);
        console.log(`   Transaction hash: ${result.hash}`);
    }
    catch (error) {
        console.error(`❌ Failed to set price for ${ticker}:`, error);
        throw error;
    }
}
async function setAllStockPrices() {
    try {
        console.log("\n💰 Setting initial prices for all stocks...");
        for (const stock of CONFIG.MOCK_STOCKS) {
            await setStockPrice(stock.ticker, stock.initialPrice);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log("✅ All stock prices set successfully");
    }
    catch (error) {
        console.error("❌ Failed to set all stock prices:", error);
        throw error;
    }
}
async function verifySetup() {
    try {
        console.log("\n🔍 Verifying setup...");
        await aptosClient.getAccountResource(CONFIG.MODULE_ADDRESS, `${CONFIG.MODULE_ADDRESS}::${CONFIG.MODULE_NAME}::MultiStockMock`);
        console.log("✅ MultiStockMock module is deployed and accessible");
    }
    catch (error) {
        console.error("❌ Setup verification failed:", error);
        throw error;
    }
}
async function main() {
    try {
        console.log("🚀 Starting MultiStockMock setup for Avila Protocol...\n");
        await initializeAptosConnection();
        await initializeMultiStockMock();
        await registerAllStocks();
        await mintTokensToAllAccounts();
        await setAllStockPrices();
        await verifySetup();
        console.log("\n🎉 MultiStockMock setup completed successfully!");
        console.log("\n📋 Summary:");
        console.log(`   - ${CONFIG.MOCK_STOCKS.length} stocks registered`);
        console.log(`   - Tokens minted to ${CONFIG.TEST_ACCOUNTS.length} test accounts`);
        console.log(`   - Initial prices set for all stocks`);
        console.log("\n🔧 The mock stocks are now ready for testing the Avila Protocol!");
    }
    catch (error) {
        console.error("\n💥 Setup failed:", error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
