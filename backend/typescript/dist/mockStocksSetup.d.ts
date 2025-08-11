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
/**
 * Initialize the Aptos client and admin account
 */
declare function initializeAptosConnection(): Promise<void>;
/**
 * Initialize the MultiStockMock module
 * Calls the init() function to set up the module
 */
declare function initializeMultiStockMock(): Promise<void>;
/**
 * Register a mock stock in the MultiStockMock module
 * Calls the register_stock() function
 */
declare function registerStock(ticker: string, name: string, decimals: number): Promise<void>;
/**
 * Register all configured mock stocks
 */
declare function registerAllStocks(): Promise<void>;
/**
 * Mint mock tokens to a specific account
 * Calls the mint() function
 */
declare function mintTokens(ticker: string, recipientAddress: string, amount: number): Promise<void>;
/**
 * Mint tokens to all test accounts for all stocks
 */
declare function mintTokensToAllAccounts(): Promise<void>;
/**
 * Set mock oracle price for a stock
 * Calls the set_price() function
 */
declare function setStockPrice(ticker: string, price: number): Promise<void>;
/**
 * Set initial prices for all stocks
 */
declare function setAllStockPrices(): Promise<void>;
/**
 * Verify the setup by checking module state
 */
declare function verifySetup(): Promise<void>;
export { initializeAptosConnection, initializeMultiStockMock, registerStock, registerAllStocks, mintTokens, mintTokensToAllAccounts, setStockPrice, setAllStockPrices, verifySetup };
//# sourceMappingURL=mockStocksSetup.d.ts.map